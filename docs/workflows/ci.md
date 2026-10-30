# CI

GitHub Actions가 PR과 push에서 검증을 실행한다. workflow 파일과 이 문서가 어긋나면 workflow 파일이 기준이다.

## Workflows

| Workflow                  | Trigger                                                                                                      | 역할                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                  | `pull_request`, `push`(main, develop)                                                                        | `Frontend CI`. 설치 전에 `check-suspicious`(변조 징후 가드)를 먼저 실행한 뒤 `yarn verify`와 같은 검사(생성물·catalog·agent docs·boundary 확인 + format·lint·typecheck·test·build)를 실행하고, 결과를 PR 댓글로 남긴다                                  |
| `e2e.yml`                 | `pull_request`, `workflow_dispatch`                                                                          | Playwright E2E(chromium). 실패 시 report·result를 artifact로 업로드                                                                                                                                                                                     |
| `security.yml`            | `pull_request`, `push`(main, develop), `workflow_dispatch`                                                   | gitleaks로 git 이력 전체의 시크릿 스캔. 시크릿이 있으면 실패                                                                                                                                                                                            |
| `create-work-branch.yml`  | `issues: opened`                                                                                             | 이슈 메타데이터·브랜치 자동 생성 후 Discord 알림 — `docs/conventions/git.md`                                                                                                                                                                            |
| `pr-metadata.yml`         | `pull_request`(열림·재오픈·ready·제목 수정·동기화)                                                           | PR 타입 라벨·assignee와 릴리스 본문 자동화. develop → main은 타입 검사 제외 — `docs/conventions/git.md`                                                                                                                                                 |
| `branch-protection.yml`   | `main`을 대상으로 하는 `pull_request`                                                                        | 출발 브랜치가 `develop`이 아니면 실패 — `docs/decisions/records/005-branch-strategy.md`                                                                                                                                                                 |
| `cache-cleanup.yml`       | `pull_request_target`(닫힘)                                                                                  | PR이 닫히면 그 PR이 만든 Actions 캐시를 삭제한다. `develop`·`main`의 캐시는 건드리지 않는다. PR 코드를 checkout하지 않는다                                                                                                                              |
| `discord-notify.yml`      | `pull_request`(닫힘)                                                                                         | PR merge Discord 알림, webhook 없으면 스킵. 열림·재오픈·ready 알림은 제목 확정 뒤 `pr-metadata.yml`의 notify job이 보낸다                                                                                                                               |
| `discord-pr-conflict.yml` | `pull_request_target`(열림·재오픈·갱신), `push`(main, develop)                                               | 충돌 상태(`CONFLICTING`)인 PR을 Discord로 알림. PR 코드를 checkout하지 않는다. webhook 없으면 스킵                                                                                                                                                      |
| `chromatic.yml`           | 모든 브랜치의 `push`(태그 제외). design-system·`package.json`·`yarn.lock`·`.yarnrc.yml`·workflow 자신의 변경 | 디자인 시스템 Storybook의 시각 변경을 Chromatic에서 검토한다. 설치 전에 변조 가드를 실행하고, `CHROMATIC_PROJECT_TOKEN`이 없으면(포크·Dependabot, 토큰 미등록) 단계를 건너뛰어 job은 성공으로 끝난다. 포크 PR은 이 저장소에 push가 없어 실행되지 않는다 |

## 필수 체크

`Verify`(`Frontend CI`, `ci.yml`)가 branch protection의 required check다. `Secret scan`(`Security`)과 `Metadata`(`PR Metadata`)도 필수 체크로 두면 시크릿이 든 PR과 타입을 읽을 수 없는 일반 작업 PR은 머지되지 않는다. `develop` → `main` 릴리스 PR은 타입 검사를 생략한다(필수 체크 지정은 저장소 관리자가 GitHub에서 설정한다). `Validate Source Branch`(`Branch Protection`)는 **`main`의 ruleset에만** 필수 체크로 지정한다. 이 workflow는 `main` 대상 PR에서만 돌아서, `develop` 대상 PR까지 필수로 걸면 체크가 오지 않아 모든 PR이 대기 상태로 막힌다. 같은 PR·브랜치에 새 commit이 push되면 이전 CI run은 concurrency 설정으로 취소된다.

## CI 결과 댓글

`Frontend CI`는 PR에 단계별 결과 표를 댓글로 남긴다. 같은 PR에서는 새 댓글을 만들지 않고 기존 댓글을 갱신한다. 한 단계가 실패해도 나머지를 끝까지 실행해서 한 번에 모두 보여 준다. 단 `변조 가드`나 `의존성 설치`가 실패하면 그 뒤 단계는 실행하지 않고 "건너뜀"으로 표시한다. 설치는 코드를 실행할 수 있는 단계라서 가드가 실패하면 하지 않는다.

- `ci.yml`은 `package.json`의 `verify`와 같은 검사를 실행한다. 생성물·catalog·agent docs·boundary·format 검사 뒤에 `yarn lint`, `yarn typecheck`, `yarn test`를 같은 runner에서 병렬로 실행한다. 세 검사가 끝나면 각각의 로그와 성공·실패 결과를 모은 뒤 빌드를 별도로 실행한다. Next.js 생성 파일을 공유하는 typecheck와 build는 동시에 실행하지 않는다. `verify`에 검사를 더하거나 빼면 `ci.yml`의 명령, job `outputs`, 댓글 표를 함께 고친다.
- 댓글은 같은 저장소 안의 PR에서만 남긴다. 포크와 Dependabot PR은 토큰이 읽기 전용이라 댓글을 쓸 수 없어서 건너뛴다. 이때도 `Verify` 체크의 성공·실패는 그대로 나온다.
- ruleset의 필수 체크 입력란에는 job 이름인 `Verify`를 지정한다. Actions 화면에서는 `Frontend CI` workflow 안에 표시된다. 댓글 job(`Result comment`)은 필수가 아니다.

## 빌드 캐시

`Frontend CI`는 `actions/cache`로 Turbo 캐시(`.turbo/cache`)와 Next.js 빌드 캐시(`apps/web/.next/cache`)를 이어 받는다. Turbo는 입력이 같은 패키지의 lint·typecheck·test·build 결과를 재사용해서 바뀐 앱만 다시 실행한다. Next 캐시는 Turbo 출력에서 제외되어 있어 따로 둔다.

- 캐시가 없거나 맞지 않으면(첫 실행, 소스·`yarn.lock` 변경으로 Next 캐시 키가 달라진 경우, 7일 이상 미사용으로 만료) 해당 부분을 다시 실행하므로 느려질 뿐 결과는 같다. 캐시 서비스 오류는 경고로만 처리되어 CI를 실패시키지 않는다.
- 저장은 `actions/cache/save`를 마지막 "Fail if any check failed" 단계 앞에 따로 둔다. 기본 자동 저장은 job이 성공해야 실행되는데, 이 job은 검사가 하나라도 실패하면 실패로 끝나서 고친 뒤 다시 push할 때마다 캐시 없이 시작하게 된다. 설치가 성공한 뒤에는 검사 결과와 상관없이 저장하고(Turbo는 성공한 작업의 결과만 캐시한다), 변조 가드나 설치가 실패하면 저장하지 않는다.
- Turbo 캐시가 hit한 작업은 다시 실행하지 않고 이전 로그만 재생한다. 입력(소스, 의존성, `turbo.json`)이 같을 때만 hit하므로 검증을 건너뛰는 것은 아니다. 의심스러우면 Actions의 Caches에서 해당 캐시를 지우고 다시 실행한다.
- Turbo 캐시 키에 커밋 SHA를 쓰므로 실행마다 항목이 새로 저장된다. PR이 닫히면 `cache-cleanup.yml`이 그 PR의 캐시를 지워서 쌓이지 않게 한다. `develop`·`main`에 push되며 저장된 캐시는 정리하지 않고 아래 한도에 의한 삭제에 맡긴다. 저장소 캐시 한도(10GB)를 넘으면 오래된 항목부터 지워진다.
- Next 캐시는 빌드가 성공한 실행에서만 저장한다. 중간에 실패한 빌드의 부분 캐시가 그 키에 고정되지 않게 하려는 것이다.
- Turbo 설정(`turbo.json`)의 `outputs`·`inputs`·`env`를 바꾸면 캐시가 틀린 결과를 재사용하지 않는지 확인한다.

## 로컬 재현

Web의 `next-env.d.ts`와 `.next/`는 자동 생성물이므로 Git에서 제외한다. `yarn workspace @app/web typecheck`는 `next typegen && tsc --noEmit` 순서로 실행해 새 checkout에서도 필요한 선언과 route 타입을 먼저 생성한다. `next dev`와 `next build`도 이 파일을 생성하며, `next-env.d.ts`를 직접 편집하지 않는다.

`check:generated`는 디자인 시스템의 SVG → TSX 아이콘 동기화(`icons:check`), barrel·컴포넌트 구조, 디자인 토큰 CSS를 검증한다. 아이콘 원본을 바꾸면 `yarn workspace @app/design-system icons:build`로 TSX와 barrel을 함께 갱신한다.

```bash
yarn install --immutable
yarn verify
```

E2E:

```bash
yarn e2e:typecheck
yarn e2e:install
yarn e2e
```

## CI 실패 시

1. 실패한 job(`Verify`, `E2E` 중 어디인지)을 먼저 확인한다.
2. `Verify` 실패면 `yarn verify`를 로컬에서 재현해 어떤 하위 명령(`check:suspicious`, `check:generated`, `check:catalog`, `check:agent-docs`, `check:boundaries`, `format:check`, `lint`, `typecheck`, `test`, `build`)이 실패했는지 좁힌다. `Suspicious file guard` 단계가 실패했다면 아래 "변조 가드"를 먼저 확인한다.
3. `E2E` 실패면 업로드된 `playwright-report`, `test-results` artifact를 확인한다.

## 시크릿 스캔

`security.yml`은 전체 이력(`fetch-depth: 0`)을 gitleaks로 스캔해서 커밋된 토큰·키·`.env` 값을 찾는다. 저장소를 공개로 돌린 뒤에도 그대로 둔다. `gitleaks-action`은 조직 저장소에서 라이선스 키가 필요해 쓰지 않고, 공식 이미지를 digest로 고정해 직접 실행한다. `--redact`라서 시크릿 값은 로그에 찍히지 않고, `--verbose`로 규칙·파일·줄·커밋·fingerprint가 나온다. 탐지를 예외로 둘 때만 저장소 루트의 `.gitleaksignore`에 fingerprint를 이유와 함께 추가한다. 시크릿이 실제로 노출됐다면 예외가 아니라 해당 키를 폐기하고 교체한다.

의존성 취약점은 workflow로 따로 스캔하지 않는다. 저장소를 공개로 돌리면 Dependabot alerts와 security updates를 무료로 쓸 수 있어(`.github/dependabot.yml`) 같은 취약점 DB를 중복해서 보게 된다.

## 변조 가드와 CODEOWNERS

저장소가 탈취된 계정으로 변조되는 공급망 공격을 막기 위한 두 겹이다. 폴더를 열거나 `install`·`dev`·`lint`를 돌리는 것만으로 코드가 실행되게 만드는 변경이 대상이다.

- `turbo/workflows/check-suspicious.mjs`(`yarn check:suspicious`)가 의존성 없이 아래를 검사한다. `ci.yml`에서는 `yarn install` **전에** 먼저 실행하고, 로컬의 `yarn verify`에도 포함된다. `node turbo/workflows/check-suspicious.mjs --self-test`로 규칙이 알려진 수법을 잡는지 확인할 수 있다.
  - `.vscode/tasks.json`의 `folderOpen` 자동 실행, `.vscode/settings.json`의 `task.allowAutomaticTasks` 켜기
  - 공백 80칸 이상 뒤에 이어지는 코드, 3000자가 넘는 JS·TS 한 줄, 난독화 도구의 `_0x…` 식별자
  - 폰트 확장자(`.eot`, `.woff`, `.ttf` 등)인데 바이너리가 아닌 파일
  - `package.json`의 설치 시점 스크립트(`preinstall`, `postinstall` 등, `prepare: "husky"`만 허용), `curl`·`wget`·`eval`, 허용 경로(`turbo/`, `.agents/`, `.github/`, `scripts/`) 밖 파일의 `node` 실행. 단 `node --test <이름>.test.mjs`처럼 테스트 파일을 실행하는 형태는 허용한다. 파일 내용은 검사하지 못하므로 악의적인 테스트 파일은 코드 오너 리뷰로 막는다.
  - `.gitignore`에서 `.env`가 빠지는 변경
- 휴리스틱이라 우회될 수 있고 오탐도 있을 수 있다. 의도한 변경이 걸리면 코드 오너와 확인한 뒤 스크립트의 허용 목록을 조정한다. 방어의 기본은 아래 리뷰 강제와 계정 보안이다.
- `.github/CODEOWNERS`는 **모든 파일**을 코드 오너(`@KyeongJooni`, `@Hyochan02`)가 소유하게 해서 PR마다 두 사람을 리뷰어로 자동 요청한다(PR 작성자 본인은 요청되지 않고, 오너는 저장소에 write 권한이 있어야 인정된다). `.github/`, `.vscode/`, `.husky/`, `.claude/`, `turbo/`, `scripts/`, `.agents/scripts/`, `package.json`, `.yarnrc.yml`, `eslint.config.*` 같은 실행 경로는 별도 줄로도 명시해, 전체 소유 범위가 바뀌어도 이 두 사람의 승인이 유지되게 한다. 파일마다 **마지막으로 맞는 줄이 적용**되므로, 전체 소유(`*`) 줄은 맨 아래에 두었다. 나중에 `*`의 소유자를 바꾸면 위의 실행 경로 줄이 덮어써져 보호가 풀리니, 그때는 `*`를 맨 위로 옮기거나 경로 줄을 다시 확인한다. 이 파일만으로는 승인이 강제되지 않으므로 저장소 관리자가 branch protection(ruleset)에서 **Require review from Code Owners**를 켜야 한다. 켜면 모든 PR이 두 사람 중 한 명(작성자 제외)의 승인을 받아야 머지된다.

저장소 관리자가 GitHub에서 설정하면 이번 공격 유형을 더 막을 수 있다(이 저장소의 코드로는 강제되지 않으며, 설정 여부는 코드에서 확인할 수 없다).

- `main`: force push·삭제 금지, PR 필수, 승인 1명 이상, Code Owners 승인 필수
- write 권한은 필요한 사람에게만 주고, 오래 쓰지 않은 권한은 회수
- 조직의 2단계 인증 필수, secret scanning과 push protection 사용
- 처음 받은 저장소는 에디터로 열기 전에 터미널에서 `.vscode/tasks.json`부터 확인하고, VS Code의 Workspace Trust는 끄지 않는다

## 이슈·PR 자동화

이슈 생성 시 브랜치 자동 생성, PR의 라벨·assignee 자동화, 브랜치 네이밍 규칙은 `docs/conventions/git.md`를 확인한다.

## 아직 활성화되지 않은 템플릿

`.github/workflow-templates/`에는 Storybook Pages 배포, Lighthouse 성능 감사, Vercel 배포, CodeQL workflow 초안이 있다. `.github/workflows/`가 아닌 곳에 있어 실행되지 않으며, 각 파일이 요구하는 전제(secret 설정, 저장소 공개 전환 등)가 갖춰지기 전까지는 도입하지 않는다. 조건이 갖춰지면 해당 템플릿을 `.github/workflows/`로 옮기고 이 문서에 실제 trigger·역할을 추가한다. 자세한 활성화 조건은 `.github/workflow-templates/README.md`를 확인한다.

Storybook Pages 배포(`storybook-deploy.yml`)도 저장소를 공개로 돌린 뒤에 활성화한다. 비공개 저장소의 Pages는 플랜 제한이 있을 수 있다. 활성화할 때 저장소 Settings → Pages의 Source를 GitHub Actions로 지정하고, 이 문서의 Workflows 표에 trigger와 역할을 추가한다.

CodeQL(`codeql.yml`)은 저장소를 공개로 돌린 뒤에 활성화한다. 비공개 저장소에서는 code scanning에 GitHub Advanced Security가 필요하다. 비공개인 동안에는 `yarn check:suspicious`, Dependabot, 코드 오너 리뷰가 보안 방어의 중심이다. 활성화하면 이 문서의 Workflows 표에 trigger와 역할을 추가한다.

## Storybook 시각 검토

- `chromatic.yml`은 Storybook을 이 저장소에서 빌드하고(`storybookBuildDir`) 결과만 Chromatic에 올린다. `pull_request` 이벤트는 임시 병합 커밋 때문에 baseline이 잘못 잡힐 수 있어 Chromatic 문서대로 `push`만 쓴다. 변경이 감지돼도 기본 종료 코드는 0이라 체크가 실패하지 않으며, merge commit만 허용하므로 `autoAcceptChanges`는 쓰지 않는다(squash·rebase 병합을 쓰게 되면 다시 검토). `push`와 paths 필터로 동작하므로 변경이 paths 밖이면 그 커밋에는 실행이 없다. 따라서 Chromatic을 필수 체크로 지정하면 해당 PR이 대기 상태로 남아 쓸 수 없다. 브랜치 push마다 실행되지만 TurboSnap이 동작하면 바뀐 story만 찍는다. 동작하지 않을 때는 PR을 열기 전 WIP push도 스냅샷 한도를 쓴다. 프로젝트 토큰은 Chromatic에서 만들어 저장소 Secrets에 `CHROMATIC_PROJECT_TOKEN`으로 등록하며, 채팅·문서·로그에 쓰지 않는다.
- 변경된 story만 찍는 `onlyChanged`(TurboSnap)를 켜 두었다. 이를 위해 `build-storybook --stats-json`으로 `preview-stats.json`을 만들고(미리 빌드한 Storybook을 쓸 때 필요), 모노레포라서 `storybookBaseDir`·`storybookConfigDir`를 repo root 기준으로 지정한다. `tokens/*.css`는 `storybook.css`가 `@import`해서 의존 그래프에 별도 모듈로 잡히지 않으므로 `externals`로 지정해 바뀌면 전체를 다시 찍는다. 문서로 확인한 사항(Chromatic TurboSnap 문서): Storybook 8+의 Vite는 `--stats-json`을 지원하고, stats 파일이 없으면 빌드를 실패시키지 않고 전체를 찍는다. TurboSnap은 `pull_request` 트리거와 호환되지 않아 `push`만 쓴다. `package.json`·`yarn.lock`·`.storybook`·`preview`가 import하는 파일·`externals`가 바뀌면 전체를 다시 찍는다. merge commit은 조상이 둘이라 예상보다 많이 다시 찍을 수 있다. 확인하지 못한 사항: `storybookConfigDir`·`externals`의 기준 경로와 여러 줄 값의 분리는 문서 예시를 따랐을 뿐 실행으로 확인하지 않았고, 문서에 Yarn PnP 설명이 없고(로컬 빌드에서 stats 생성과 모듈 경로 `./src/...`만 확인), 사전 조건에 "완료된 CI 빌드 10개"가 있어 처음에는 전체가 찍힐 수 있으며, 실제 Chromatic 실행으로 바뀐 story만 선택되는지 확인하지 않았다. 매번 전부 찍히거나 필요한 story를 놓치면 이 설정을 다시 검토한다.
- 무료 플랜에는 월 스냅샷 한도가 있다. 시각 검토가 필요 없는 story는 `parameters: { chromatic: { disableSnapshot: true } }`로 제외하고, 변형 조합은 한 story(예: Button `Matrix`)에 모아 스냅샷 수를 줄인다. Toast처럼 `Matrix`가 모든 형태를 보여 주면 개별 story는 스냅샷에서 제외한다. 한도 초과 시 동작은 Chromatic 문서를 확인한다.
- 앱 화면 단위 시각 검증은 Playwright 스냅샷이 맡고, 화면이 생긴 뒤 별도로 도입한다.

## 디자인 토큰 동기화

`sync-design-tokens.yml`은 `design-token`에 Push된 `packages/design-system/tokens/tokens.json` 변경 또는 수동 실행을 대상으로 한다. `yarn tokens:build`, `yarn tokens:check`, 토큰 변환 테스트를 실행하고 생성 CSS를 커밋한 뒤 `develop` PR을 생성하거나 갱신한다.

저장소 secret `DESIGN_TOKENS_PR_TOKEN`에는 Contents와 Pull requests의 읽기·쓰기 권한이 필요하다. `design-token`에도 workflow, 변환 스크립트와 package 명령을 함께 유지한다. 최초 파일 반영 직후에는 workflow를 한 번 수동 실행하고, 이후 토큰 원본 Push부터 자동 실행한다.

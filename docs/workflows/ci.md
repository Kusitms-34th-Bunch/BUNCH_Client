# CI

GitHub Actions가 PR과 `main`·`develop` push에서 검증을 실행한다. workflow 파일과 이 문서가 어긋나면 workflow 파일이 기준이다.

## Workflows

| Workflow                 | Trigger                                                    | 역할                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                 | `pull_request`, `push`(main, develop)                      | 설치 전에 `check-suspicious`(변조 징후 가드)를 먼저 실행한 뒤 `yarn verify`(변조 가드·생성물·catalog·agent docs·boundary 확인 + format·lint·typecheck·test·build) 실행 |
| `e2e.yml`                | `pull_request`, `workflow_dispatch`                        | Playwright E2E(chromium). 실패 시 report·result를 artifact로 업로드                                                                                                    |
| `security.yml`           | `pull_request`, `push`(main, develop), `workflow_dispatch` | gitleaks로 git 이력 전체의 시크릿 스캔. 시크릿이 있으면 실패                                                                                                           |
| `create-work-branch.yml` | `issues: opened`                                           | 이슈 폼에서 브랜치 자동 생성 — `docs/conventions/git.md`                                                                                                               |
| `pr-metadata.yml`        | `pull_request`(열림·재오픈·ready·제목 수정·동기화)         | PR 타입 라벨·assignee 자동화, 타입 라벨을 붙일 수 없는 PR은 실패 — `docs/conventions/git.md`                                                                           |
| `branch-protection.yml`  | `main`을 대상으로 하는 `pull_request`                      | 출발 브랜치가 `develop`이 아니면 실패 — `docs/decisions/records/005-branch-strategy.md`                                                                                |
| `discord-notify.yml`     | `pull_request`(열림·재오픈·ready·닫힘)                     | Discord 알림, webhook 없으면 스킵                                                                                                                                      |

## 필수 체크

`CI / Verify`가 branch protection의 required check다. `Security / Secret scan`과 `PR Metadata / Metadata`도 필수 체크로 두면 시크릿이 든 PR과 PR 제목·브랜치에서 타입을 읽을 수 없는 PR은 머지되지 않는다(필수 체크 지정은 저장소 관리자가 GitHub에서 설정한다). `Branch Protection / Validate Source Branch`는 **`main`의 ruleset에만** 필수 체크로 지정한다. 이 workflow는 `main` 대상 PR에서만 돌아서, `develop` 대상 PR까지 필수로 걸면 체크가 오지 않아 모든 PR이 대기 상태로 막힌다. 같은 PR·브랜치에 새 commit이 push되면 이전 CI run은 concurrency 설정으로 취소된다.

## 로컬 재현

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

- `turbo/workflows/check-suspicious.mjs`(`yarn check:suspicious`)가 의존성 없이 아래를 검사한다. `ci.yml`에서는 `yarn install` **전에** 먼저 실행하고, `yarn verify`에도 포함된다. `node turbo/workflows/check-suspicious.mjs --self-test`로 규칙이 알려진 수법을 잡는지 확인할 수 있다.
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

`.github/workflow-templates/`에는 Chromatic, Lighthouse 성능 감사, Vercel 배포, CodeQL workflow 초안이 있다. `.github/workflows/`가 아닌 곳에 있어 실행되지 않으며, 각 파일이 요구하는 secret을 설정하기 전까지는 도입하지 않는다. 조건이 갖춰지면 해당 템플릿을 `.github/workflows/`로 옮기고 이 문서에 실제 trigger·역할을 추가한다. 자세한 활성화 조건은 `.github/workflow-templates/README.md`를 확인한다.

CodeQL(`codeql.yml`)은 저장소를 공개로 돌린 뒤에 활성화한다. 비공개 저장소에서는 code scanning에 GitHub Advanced Security가 필요하다. 비공개인 동안에는 `yarn check:suspicious`, Dependabot, 코드 오너 리뷰가 보안 방어의 중심이다. 활성화하면 이 문서의 Workflows 표에 trigger와 역할을 추가한다.

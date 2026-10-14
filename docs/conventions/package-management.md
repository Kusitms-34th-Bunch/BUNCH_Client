# Workspace Rules

- Yarn 4 PnP를 사용한다. 모든 패키지 명령은 `yarn`으로 실행한다.
- PnP를 선택한 배경, Vite 경고 처리, 재검토 조건은 `docs/decisions/records/002-yarn-pnp-workspace-installation.md`를 따른다.
- `apps/web`의 `dev`·`build`는 `--webpack`을 유지한다. Next 16의 기본 번들러인 Turbopack은 Yarn PnP를 지원하지 않고 계획도 없다(Next.js 공식 문서의 Turbopack "Unsupported and unplanned features"). 빌드를 빠르게 하려고 `--webpack`을 지우지 않는다. PnP를 벗어나는 결정이 아니면 바꾸지 않는다.
- **예외**: `apps/mobile-shell`은 Expo/Metro가 PnP를 지원하지 않아 pnpm을 쓴다. root Yarn workspace에서 제외돼 있고, 설치·의존성 관리는 그 폴더 안에서만 한다. 배경은 `docs/decisions/records/003-mobile-shell-pnpm-exception.md`, 구조는 `docs/architecture/mobile-shell.md`를 확인한다.
- 의존성 버전은 root `package.json`의 Yarn workspace 설정과 lockfile을 기준으로 관리한다. 같은 library를 임의로 workspace마다 다른 버전으로 추가하지 않는다.
- `apps/*`는 배포 단위이며 다른 앱을 import하지 않는다.
- `packages/*`는 앱에서 사용할 수 있지만 앱 코드에 의존하지 않는다.
- `@app/design-system`은 앱의 라우팅·API·도메인 로직을 포함하지 않는다.
- `@app/api-core`는 UI와 라우팅에 의존하지 않는다.
- `turbo.json`의 boundary 규칙을 우회하는 경로 alias나 상대 import를 만들지 않는다.
- 의존성은 실제 소유 workspace에 추가한다. app 전용 UI·router·runtime 의존성은 app에, 여러 app이 함께 쓰는 구현만 shared package에 둔다.
- 새 라이브러리가 필요하면 추측으로 고르기 전에 `.agents/future-skills/`에 관련 lookup(`pick-ui-library`, `library-picks` 등)이 있는지 먼저 확인한다. 없으면 직접 조사하고, 실제로 도입하면 이 문서나 관련 architecture 문서에 선택 근거를 남긴다.
- shared package 사이 의존성은 public package name으로 선언한다. workspace 내부 소스를 깊은 상대 경로로 import하지 않는다.
- dependency 또는 lockfile 변경 뒤에는 `yarn install`과 영향 workspace의 lint·typecheck·test를 확인한다. 가능한 경우 `yarn workspace <name> <script>`로 범위를 좁힌다.
- generator의 source·template 의존성은 generator가 소유하며, 생성물이 아직 사용하지 않는 runtime 의존성을 미리 추가하지 않는다.
- `yarn.lock` 충돌은 손으로 병합하지 않는다. 한쪽 브랜치의 `yarn.lock`을 그대로 채택한 뒤(`git checkout --ours` 또는 `--theirs`, merge/rebase에 따라 방향이 반대이므로 확신이 없으면 `git checkout <기준 브랜치> -- yarn.lock`) `yarn install`로 다시 생성한다. lockfile은 `package.json`과 `.yarnrc.yml`의 결정론적 함수이므로, 직접 병합하면 parsing은 통과해도 실제 의존성 그래프와 어긋난 파일이 만들어지기 쉽다.

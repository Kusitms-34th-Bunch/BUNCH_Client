# Git Workflow

이슈 생성부터 브랜치, PR, 라벨까지 이어지는 흐름은 `.github/workflows/`에서 자동화되어 있다. 이 문서는 그 자동화가 실제로 하는 일을 설명한다. workflow와 문서가 어긋나면 workflow 파일이 기준이다.

## 브랜치 전략

- 작업 브랜치는 `develop`에서 만들고 `develop`으로 PR한다.
- `main`은 프로덕션 전용이다. `develop`에서 `main`으로 올리는 릴리스 PR로만 바뀌고, 직접 커밋하거나 push하지 않는다.
- 저장소의 default branch를 `develop`으로 설정한다. 이슈 브랜치 자동 생성(`create-work-branch.yml`)이 default branch에서 브랜치를 만들기 때문이다. default가 `main`이면 작업 브랜치가 프로덕션 코드에서 갈라진다.
- 이유는 `docs/decisions/records/005-branch-strategy.md`를 확인한다.

## 이슈 생성 → 브랜치 자동 생성

1. `.github/ISSUE_TEMPLATE/issue.yml` 폼으로 이슈를 만든다. "브랜치명"(영어)과 "브랜치 타입"(`feat`/`fix`/`hotfix`/`refactor`/`remove`/`rename`/`style`/`test`/`docs`/`chore`)을 입력한다.
2. 이슈가 열리면 `create-work-branch.yml`이 실행되어:
   - `.github/scripts/parse_issue.py`로 폼 값을 파싱하고
   - `<이슈번호>-<타입>/<브랜치명>` 형식의 브랜치를 default branch에서 만들어 push하고 (예: `12-feat/login-page`)
   - 이슈 제목을 `[Type] #번호 - 제목` 형식으로 바꾸고
   - 타입에 맞는 라벨(`FEAT`, `FIX` 등)을 만들고 이슈에 붙이고
   - 작성자를 assignee로 지정하고
   - 같은 이름의 브랜치가 이미 있으면 새로 만들지 않고, 만들었는지 이미 있었는지를 댓글에 구분해 적는다.
   - 브랜치명, 기준 브랜치, 브랜치로 옮기는 명령(`git fetch origin`, `git switch <브랜치>`)을 이슈 댓글로 남긴다.
3. 폼 값이 비어 있거나 타입을 못 찾으면 브랜치·라벨·담당자를 만들지 않고, 어떤 칸을 읽지 못했는지 이슈에 댓글로 알린 뒤 workflow를 실패 처리한다. 이 workflow는 이슈를 열 때만 실행되므로 내용을 고쳐도 다시 실행되지 않는다. 이슈를 닫고 새로 만든다.

PR을 열 때 이 이슈 제목이 PR 제목(`[Type] 제목`)이 되므로, 이슈 제목은 짧은 자연어 한 줄로 쓴다. 함수·컴포넌트 이름 같은 구현 용어와 장문 서술은 피한다.

## 작업 시작과 병렬 세션

- 브랜치를 옮기기 전에 `git status --short`로 커밋 안 된 변경이 없는지 본다. 있으면 먼저 커밋하거나 옮긴다.
- 자동 생성된 브랜치로는 `git fetch origin && git switch <브랜치>`로 옮긴다. 직접 만들 때는 로컬 기준 브랜치를 거치지 않고 `git switch -c <이름> origin/<기준 브랜치>`로 만든다. 다른 사람이 머지하면 `origin/*`만 움직이고 로컬 브랜치는 멈춰 있어서, 로컬에서 파면 뒤처진 자리에서 시작한다.
- 작업을 시작하기 전에 `git rev-list --count HEAD..origin/<기준 브랜치>`가 0인지 본다. 0이 아니면 먼저 따라잡는다. 뒤처진 브랜치에서 올린 PR은 충돌이 크게 난다.
- 기존 PR 브랜치에 커밋을 더 올리기 전에 `gh pr view <번호> --json state`가 `MERGED`가 아닌지 확인한다. 머지된 뒤에 올린 커밋은 어디에도 반영되지 않으므로 새 이슈·브랜치·PR로 옮긴다.
- AI 세션을 둘 이상 동시에 돌리거나 작업을 동시에 열 때는 폴더를 나눈다. 한 폴더에서 브랜치를 바꾸면 다른 세션의 커밋 안 된 파일이 사라지거나 섞인다. `git worktree add .worktrees/<이름> <브랜치>`를 쓰고, 워크트리마다 `yarn install`을 한다(PnP 파일은 추적되지 않는다). 끝나면 `git worktree remove`로 지운다.

## PR 생성 시 자동 라벨·assignee와 타입 검사

`pr-metadata.yml`이 PR이 열리거나 재오픈·ready for review·제목 수정·동기화될 때 실행되어:

- PR을 **열 때 한 번**, 브랜치가 `<이슈번호>-<type>/<이름>` 형식이면 연결된 이슈의 제목으로 PR 제목을 `[Type] 제목`(예: `[Feat] 로그인 페이지`)으로 바꾼다. 이후에 고친 제목은 덮어쓰지 않으며, 이슈를 못 찾거나 브랜치가 형식에 안 맞으면 제목을 그대로 둔다.
- PR 제목(`[Type] 제목` 또는 `type: subject` 형식) 또는 브랜치명에서 타입을 다시 파싱해 같은 라벨을 붙이고, 기존에 다른 타입 라벨이 있으면 제거한다.
- PR에 assignee가 없으면 작성자를 지정한다.
- 제목과 브랜치명 어디에서도 타입을 찾지 못하면 `PR Metadata / Metadata` check가 **실패**한다. 필수 체크로 지정돼 있으면 머지할 수 없고, PR 제목을 `[Type] 제목` 또는 `type: subject` 형식으로 고치면 다시 실행되어 통과한다.
- fork에서 온 PR, dependabot PR, 봇이 만든 PR은 건드리지 않는다(이 검사도 적용되지 않는다).

## 디자인 토큰 자동 PR

- `.github/workflows/sync-design-tokens.yml`은 `design-token`의 `packages/design-system/tokens/tokens.json` 변경 또는 수동 실행을 대상으로 한다.
- Yarn 4·Node 24로 CSS 생성과 토큰 테스트를 실행하고 `tokens.css`만 같은 브랜치에 커밋·push한다. Git hook은 유지한다. 원본·CSS가 `develop`과 같으면 PR을 만들지 않고, 열린 `design-token` → `develop` PR이 있으면 재사용한다.
- repository Actions secret `DESIGN_TOKENS_PR_TOKEN`에 이 저장소만 선택한 fine-grained PAT를 등록한다. `Contents: Read and write`, `Pull requests: Read and write`가 필요하며 조직 정책에 따라 승인이 필요할 수 있다. Tokens Studio 연결용 PAT와 별도 관리하는 편이 만료·권한 관리에 편하다.
- PAT로 commit push와 PR 생성 요청을 인증해 후속 CI를 실행한다. [GitHub 공식 문서](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs)에 따르면 `GITHUB_TOKEN`으로 생성·갱신한 PR의 workflow는 승인 대기가 필요할 수 있다.
- 최초 적용 시 workflow·변환 스크립트와 최신 `develop` 변경을 `design-token`에도 반영해야 한다. 이후 PR을 merge할 때 지속 사용하는 `design-token` 브랜치는 삭제하지 않고, 다음 디자인 변경 전 `develop`을 반영한다. 자동 merge·강제 push는 하지 않는다.

## Git hook (husky)

사람과 agent 모두 걸린다. `yarn install`의 `prepare`가 hook을 건다.

- `pre-commit`: staged 파일에 `lint-staged`(eslint·prettier)를 실행한다.
- `commit-msg`: `commitlint`로 커밋 메시지 형식과 AI 출처 문구 금지를 검사한다.
- `pre-push`: `yarn typecheck`와 `yarn test`를 실행한다. 약 10초 안팎이며, 빌드는 오래 걸릴 수 있어 넣지 않았다.

실패하면 원인을 고치고 다시 시도한다. 최종 관문은 CI다.

## agent의 git 명령 제한

agent는 커밋·push·PR·이슈 생성을 사용자가 요청하고 실행 직전에 승인한 경우에만 한다. `prepare-issue`, `prepare-commit`, `prepare-pull-request` skill은 내용을 보여 주고 승인을 받은 뒤 직접 실행한다. 커밋 승인은 push·PR 승인을 대신하지 않는다. push·PR·이슈 생성은 `gh auth status`가 성공할 때만 하고, 아니면 복사해서 쓸 내용만 준다.

`.claude/hooks/guard-rules.mjs`가 agent가 실행하는 git 명령 중 위험한 것을 막는다(Claude Code·Codex 공통, 사람이 터미널에서 직접 실행하는 건 막지 않는다). 막힌 이유는 agent에게 전달된다.

- 강제 푸시는 `--force-with-lease`로만 하고, `main`·`master`에는 직접 push하지 않는다.
- `--no-verify`, `HUSKY=0`으로 husky hook을 건너뛰지 않는다.
- `git add .`·`-A`·`-u`, `git commit -a`는 쓰지 않는다. 파일 경로를 하나씩 적어 add한다.
- `reset --hard`, `clean -f`, `checkout .`, `restore .`, `stash pop·drop·clear`, `branch -D`처럼 되돌릴 수 없게 지우는 명령은 사용자 확인 뒤 사용자가 직접 실행한다.

## 브랜치 타입

| 타입       | 라벨     | 용도                      |
| ---------- | -------- | ------------------------- |
| `feat`     | FEAT     | 새로운 기능 구현          |
| `fix`      | FIX      | 버그 수정                 |
| `hotfix`   | HOTFIX   | 긴급 수정                 |
| `refactor` | REFACTOR | 코드 리팩토링             |
| `remove`   | REMOVE   | 파일 삭제                 |
| `rename`   | RENAME   | 파일, 폴더명 수정 OR 이동 |
| `style`    | STYLE    | 스타일 작업               |
| `test`     | TEST     | 테스트                    |
| `docs`     | DOCS     | 문서 수정                 |
| `chore`    | CHORE    | 기타 작업                 |

이 표와 실제 라벨 색상·설명은 `.github/scripts/parse_issue.py`의 `LABEL_MAP`이 기준이다. 타입을 추가·변경하면 이슈 템플릿의 드롭다운과 함께 갱신한다.

## PR 제목과 커밋 메시지

PR 제목은 `[Type] 제목`(자동 설정), 커밋 메시지는 `type: subject`다(scope는 한 영역에 한정된 변경에만 `type(scope): subject`로 쓴다). 둘의 type은 위 브랜치 타입과 같은 값을 쓴다(`commitlint`의 `type-enum`도 같은 값만 허용한다). 커밋 메시지 형식 자체는 `docs/conventions/commit.md`를 따른다.

## 알림

`discord-notify.yml`은 PR이 열리거나, ready for review로 바뀌거나, merge되면 Discord webhook(`secrets.DISCORD_WEBHOOK_URL`)으로 알린다. webhook이 설정되지 않으면 조용히 건너뛴다.

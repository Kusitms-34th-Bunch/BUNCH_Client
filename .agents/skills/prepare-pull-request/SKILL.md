---
name: prepare-pull-request
description: 현재 브랜치 변경과 실제 검증 근거를 바탕으로 저장소 PR 템플릿에 맞는 제목과 본문 초안을 작성한다. 초안 전에 브랜치 전체를 reviewer agent로 리뷰한다. gh 인증이 있고 사용자가 승인하면 push와 PR 생성까지 수행한다. PR 초안 또는 리뷰용 요약이 필요할 때 사용한다.
---

# Pull Request 준비

## 목표

리뷰어가 “왜 바뀌었는지, 무엇을 확인해야 하는지, 무엇을 실제로 검증했는지”를 PR 하나로 판단할 수 있게 한다. push와 `gh pr create`는 `gh auth status`가 성공하고 사용자가 실행해도 된다고 명시적으로 승인한 경우에만 이 skill이 직접 수행한다. label 변경은 하지 않는다(workflow가 채운다).

## 입력 점검

1. `docs/conventions/git.md`의 agent 실행 기준과 릴리스 본문 규칙, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/conventions/commit.md`, 현재 branch와 base branch를 확인한다.
2. `git status --short`, `git log <base>..HEAD --oneline`, `git diff <base>...HEAD --stat`과 필요한 상세 diff를 읽는다.
3. 브랜치·커밋·사용자 요청에서 이슈 번호를 찾되, 확인되지 않은 번호를 추측하지 않는다.
4. 미커밋 변경은 PR diff와 구분하고 포함 여부를 명확히 한다.

## 리뷰 게이트

PR 초안을 쓰기 **전에** 브랜치 전체(`<base>...HEAD`)를 `bunch-reviewer`(Claude Code는 `.claude/agents/`, Codex는 `.codex/agents/`)에게 맡긴다. PR은 외부 리뷰어가 처음 보는 단위이므로 커밋 단위 리뷰와 별개로 한 번 더 본다. 문서만 바뀐 PR도 호출한다. `docs/agent/bootstrap.md`의 "필수 호출 기준"에 해당하는 변경(route·API 계약·UI)은 해당 전용 reviewer도 함께 호출한다.

- `Critical`·`Major`가 있으면 초안 맨 위에 "머지 전 수정 필요"로 결과를 보여 주고 push와 PR 생성을 하지 않으며 안내도 하지 않는다. 고친 뒤 다시 호출하거나 사용자가 문제없다고 확인하면 진행한다.
- `Minor`·`Suggestion`과 검증 공백은 본문의 "리뷰 포인트"와 "리스크 / 후속 작업"에 요약한다. 상세 지적을 그대로 복사하지 않는다.
- 마지막 리뷰 이후 커밋이 늘었으면 다시 호출한다. 호출하지 않았다면 호출했다고 쓰지 않는다.

## 내용 구성

| 템플릿 section     | 작성 기준                                          |
| ------------------ | -------------------------------------------------- |
| 주요 변경사항      | 목적과 영향이 드러나는 2~4개 핵심 bullet           |
| 작업 상세 내용     | 구현 방식·경계·리뷰 이유를 4~8개 bullet            |
| 검증               | 실제 실행 command와 결과만                         |
| 리뷰 포인트        | reviewer가 확인해야 할 동작·trade-off              |
| 체크리스트         | 실제 확인 뒤 체크, 기존 항목 삭제 금지             |
| 스크린샷           | UI 변화가 있을 때 상태·viewport가 보이게 첨부 안내 |
| 리스크 / 후속 작업 | 미실행 검증, intentional exclusion, 후속 결정      |
| 관련 이슈          | 확인된 경우에만 `Close #번호`                      |

## 작성 순서

1. 변경을 사용자 동작, API/data, 구조·설정, 테스트·문서로 분류한다.
2. diff에 없는 결과나 아직 실행하지 않은 검증을 적지 않는다.
3. UI 변경은 loading/error/empty, keyboard/focus, narrow viewport 확인 여부와 screenshot 필요성을 확인한다.
4. agent·workflow 변경은 언제 어떤 파일이 읽히거나 실행되는지, trigger와 사용자에게 보이는 결과를 설명한다.
5. template heading, 순서, 체크리스트는 그대로 유지한다.

## 출력

- 필요한 경우 70자 이내 제목을 `[Type] 제목`(예: `[Feat] 로그인 페이지`) 형식으로 제안한다. 브랜치가 `<이슈번호>-<type>/<이름>`이면 PR을 열 때 workflow가 이슈 제목으로 같은 형식에 맞춘다.
- `develop` → `main` 릴리스 PR은 `docs/conventions/git.md`의 릴리스 본문을 사용한다. 그 외 PR은 템플릿 모든 section을 같은 순서로 채운 Markdown 초안을 제공한다. 모든 PR에 `git push -u origin <브랜치>`, `gh pr create --base <base> --title "<제목>" --body-file <파일>` 명령을 제공한다. 본문을 저장할 파일 경로를 명시한다.
- 이슈 번호가 없으면 `Close #`를 임의 번호로 채우지 않고 template 안내를 남긴다.
- AI 출처 문구와 실제로 수행하지 않은 검증은 넣지 않는다.

## 실행

1. 기본 결과인 초안과 명령을 준비한 뒤 `gh auth status`를 확인한다. 인증을 대신 시도하지 않는다. 실패하면 실행 여부를 묻지 않고 초안과 명령만 남기며, 웹에서 PR을 만드는 방법도 안내한다.
2. 올리기 전에 `gh pr view <브랜치> --json state`로 이미 열렸거나 머지된 PR이 아닌지, 미커밋 변경이 없는지, base 브랜치가 맞는지 확인한다. 작업 브랜치의 base는 `develop`이고, `main`을 base로 하는 PR은 `develop`에서 올리는 릴리스 PR뿐이다. 하나라도 걸리면 올리지 않고 알린다.
3. 인증이 성공하고 입력 점검을 통과하면 제목·본문·명령을 보여 준 뒤 "push하고 PR을 올릴까요?"를 사용자에게 묻는다. 사용자가 "명령만"·"초안만"을 요청하면 묻지 않는다. 실행 질문에 긍정한 경우에만 제시한 범위를 실행한다. 이미 같은 범위를 승인했다면 다시 묻지 않고, 범위가 바뀌면 새로 승인받는다. 규칙이나 설명에 대한 동의와 커밋 승인은 push·PR 승인을 대신하지 않는다.
4. 승인되면 `git push -u origin <브랜치>`를 실행한다. `pre-push` hook(typecheck·test)이 실패하면 PR을 만들지 않고 원인을 보고하며, `--no-verify`로 우회하지 않는다. 강제 푸시가 필요하면 `--force-with-lease`를 쓰되 따로 확인받는다.
5. 본문을 임시 파일에 쓰고 `gh pr create --base <base> --title "<제목>" --body-file <파일>`로 만든다. 라벨과 assignee는 `pr-metadata` workflow가 채우므로 주지 않는다.
6. PR URL을 알려 준다. UI 변경 스크린샷은 사람이 붙인다. 만들지 않았다면 만들지 않았다고 쓴다.

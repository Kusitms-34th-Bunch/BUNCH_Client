---
name: review-pr
description: GitHub PR의 변경 diff를 독립 리뷰해 변경 줄에 inline 코멘트 초안을 만들고, `yarn review:pr`로 게시한다. `--dry-run` 인자를 주면 게시하지 않는다. 올라온 PR을 리뷰하거나 리뷰 코멘트를 달 때 사용한다.
---

# PR 인라인 리뷰

## 목표

올라온 PR의 변경 줄에 팀원이 남기는 것 같은 짧고 부드러운 코멘트와 `Summary`·`Code Review` 본문을 만든다. 이 스킬을 호출하면 리뷰하고 게시까지 한다. `--dry-run` 인자를 주면 게시하지 않는다. 게시 기준과 payload 형식의 정본은 `docs/workflows/pr-review.md`다.

## 입력 점검

1. 인자는 PR 번호 또는 `https://github.com/OWNER/REPO/pull/N`이다.
2. 인자가 없고 `gh auth status`가 성공하면 `gh pr view --json number,baseRefName,headRefOid`로 현재 브랜치의 PR을 찾는다. 찾았으면 5로 간다.
3. 인자가 없고 PR을 찾지 못했거나 인증이 없으면 AskUserQuestion으로 "리뷰할 PR을 알려 주세요"를 묻는다. 선택지는 "올렸어요(주소나 번호를 입력)"와 "아직 PR을 올리지 않았어요"다. 주소나 번호는 "Other" 입력칸으로 받는다.
4. "아직 PR을 올리지 않았어요"를 고르면 여기서 끝내고, PR을 올린 뒤 다시 부르라고 안내한다. AskUserQuestion을 쓸 수 없는 환경이면 같은 질문을 글로 묻는다.
5. `docs/workflows/pr-review.md`와 `docs/conventions/writing.md`를 읽는다.
6. 게시용 토큰을 확인한다. `GH_TOKEN` 환경 변수나 `.env.pr-review`의 `GH_TOKEN=` 줄이 있어야 한다. 줄의 존재만 확인하고 값은 읽거나 출력하지 않는다.
7. 토큰이 없으면 게시하지 않고 dry-run과 명령만 낸다.
8. `gh auth status`가 성공하면 `gh pr diff <PR> --patch`로 diff를 읽는다.
9. 인증이 없으면 base를 정한다. 기본은 `develop`이고 릴리스 PR이면 `main`이며, 사용자가 알려 주면 그 값을 쓴다.
10. `git fetch origin pull/<번호>/head` 뒤 `git diff origin/<base>...FETCH_HEAD`로 diff를 읽는다. 기존 thread는 확인하지 못했다고 결과에 적는다.
11. fetch가 실패하면 추측하지 않고 `BLOCKED`와 이유를 보고한다.

## 리뷰

1. PR 제목, base, 설명을 읽고 변경된 수작업 소스의 범위를 먼저 파악한다.
2. 독립 `bunch-reviewer`에게 PR diff만 맡긴다. 작성과 승인을 같은 맥락에서 하지 않는다.
3. `docs/agent/bootstrap.md`의 "필수 호출 기준"에 해당하는 변경(route·API 계약·UI)은 해당 전용 reviewer도 호출한다. 호출하지 않았다면 호출했다고 쓰지 않는다.
4. 기존 thread를 읽는다. `gh repo view --json nameWithOwner`로 `OWNER/REPO`를 얻고 `gh api --paginate repos/OWNER/REPO/pulls/<번호>/comments`, `.../pulls/<번호>/reviews`, `.../issues/<번호>/comments`를 모두 본다. CodeRabbit·팀원이 이미 다룬 지적은 새로 쓰지 않는다. REST로는 resolved 여부를 알 수 없다고 결과에 적는다.
5. PR 설명의 주장(동작, 라우팅, 테스트 완료)을 diff·설정·호출부와 대조하고, 불일치가 확인될 때만 질문한다.
6. 모드는 `strict`가 기본이다. 확실한 버그, 보안, 접근성, 데이터·권한, 사용자 흐름 회귀, 경계 위반만 남긴다. `--broad`를 명시하면 유지보수성, 타입 안정성, 빈·오류 상태, 테스트 리스크도 후보에 넣는다.

## 제외

- 취향 차이, 근거 없는 추정, 같은 문제의 반복
- 디자인 근거(Figma, 토큰 문서)를 확인하지 못한 색·간격·radius 지적. Figma를 보지 않았으면 "피그마 기준" 표현을 쓰지 않는다.
- 필터 대상 경로(`yarn.lock`, `.yarn/`, `.pnp.*`, `coverage/`, `storybook-static/`, 이미지·스냅샷)는 inline 코멘트를 달지 않는다. `yarn review:pr`가 이 경로의 코멘트를 오류 없이 버리므로, 지적할 것이 있으면 `Code Review` 목록에 쓴다.
- 올라오면 안 되는 gitignore 대상 파일(`.env*`, `dist/**`, `.next/**`, `.turbo/**`, 개인 메모, 실제 GPS가 든 사진)은 내용을 분석하지 않고 "올리지 않는 게 좋다"는 방향으로 한 줄만 쓴다. 비밀 값이나 개인정보가 보여도 코멘트에 값을 인용하지 않고, 노출됐다면 키 교체를 안내한다.

## 코멘트 스타일

- 게시는 영향이 큰 항목 최대 5개다. 개수를 채우려고 만들지 않고, 새 지적이 없으면 코멘트 없이 "추가 지적 없음"으로 끝낸다.
- 각 코멘트는 1~3문장이다. "왜 눈에 띄었는지 + 어떻게 보면 좋을지"만 쓴다.
- 치명 이슈가 아니면 단정 대신 질문형·제안형·확인형으로 쓴다. 확신이 약하면 의도를 먼저 묻는다. 끝은 "~좋을 것 같습니다 :)" 정도의 부드러운 말투다.
- 보고서체, 과한 확정 표현, 긴 분석은 쓰지 않는다. 이모지는 가볍게 쓰고 없어도 된다.
- 칭찬은 실제 근거가 있을 때만 쓰고 모든 코멘트를 칭찬으로 시작하지 않는다.
- 저장소 규칙 위반이면 근거 문서 경로를 한 번만 언급한다.
- 사람 이름, 과거 PR 내용, AI 출처 문구를 쓰지 않는다.
- 줄은 diff 안의 변경 줄이어야 한다. 새 코드는 `side: RIGHT`, 삭제된 기존 코드는 `LEFT`다. 범위 밖 줄은 `Code Review` 목록에 쓴다.

예시:

```md
이 `<button>`은 `type`이 없어서 form 안에서 쓰이면 제출될 수 있어요!
기본값을 `button`으로 두셔도 좋을 것 같습니다 :)
```

```md
혹시 이 색상 값은 임시로 넣어두신 걸까요?
`bg-surface-*` 토큰으로 대체할 수 있어 보여서, 확인해보셔도 좋을 것 같습니다!
```

## 리뷰 본문

`yarn review:pr`가 `## Summary`와 `## Code Review`를 요구한다. 인사말 없이 아래 형식으로 쓴다. `Code Review`의 개수 N은 dry-run 출력의 `comments` 개수와 같아야 한다.

```md
## Summary

PR의 핵심 변경을 1문장으로 요약한다.

- 변경 범위 1
- 변경 범위 2

## Code Review

인라인 코멘트를 N건 남겼습니다.

- `path/to/file.tsx:13` 무엇이 문제인지, 왜 문제인지, 어떻게 하면 좋은지를 한두 문장으로
```

코멘트가 없으면 `Code Review`에 "추가로 남길 inline comment는 없습니다."라고 쓴다. 줄 anchor가 불가능한 지적(base 브랜치, 충돌, 검증 자료 요청)과 필터 경로의 지적은 같은 목록에 쓴다.

본문은 팀원이 읽는 글이다. 아래를 지킨다.

- 목록 항목은 "~ 확인"처럼 명사구로 끊지 않는다. 코멘트를 열지 않아도 문제와 이유가 읽히게 문장으로 쓴다.
- 리뷰 과정의 메모는 본문에 쓰지 않는다. thread를 어떤 방법으로 읽었는지, 코드만 읽었는지, 로컬에서 실행했는지, 기존 thread가 없었다는 사실이 해당한다. 이런 내용은 채팅 보고(출력 절)의 검증 공백에 쓴다.
- 판단에 영향을 주는 미확인 사항(예: 렌더를 못 봐서 넘침을 확정하지 못함)은 해당 지적 문장 안에 사실 하나로 쓴다.

## 게시

1. payload JSON을 저장소 밖 임시 디렉터리(scratchpad)에 만든다. `line`은 새 코드의 변경된 줄이고 `side`는 `RIGHT`다.
2. `yarn review:pr -- --pr <PR> --comments <파일> --dry-run`을 실행한다.
3. dry-run 출력의 코멘트 목록과 본문을 사용자에게 보여 주고, `comments` 개수가 기대와 같은지 확인한다.
4. 입력 점검 6단계(토큰 확인)를 통과했고 인자에 `--dry-run`이 없으면 같은 payload로 `--publish`를 실행한다. 스킬을 호출한 것이 게시 요청이므로 별도 확인을 묻지 않는다.
5. 이 게시는 `gh auth status`가 아니라 `GH_TOKEN`으로 동작한다.
6. 인자에 `--dry-run`이 있으면 게시하지 않고 dry-run 결과만 보여 준다.
7. 기존 thread를 확인하지 못했으면 중복 코멘트가 달릴 수 있다고 결과에 알린다.
8. dry-run 뒤에 payload를 바꿨거나 PR에 새 커밋이 올라갔으면 diff와 dry-run을 다시 확인한 뒤 게시한다.
9. 게시가 실패하면 payload를 수정해 dry-run부터 다시 한다. 스크립트는 상태 코드만 출력하므로 앵커 거부는 줄 번호를 의심해 추정한다. 리뷰는 한 번의 요청이라 일부 코멘트만 거부되는 경우는 없고, 전체가 성공하거나 실패한다. 의심되는 코멘트는 `Code Review` 목록으로 옮긴다.
10. 비공개 저장소에서 `status=404`가 나오면 토큰에 이 저장소 접근 권한이 없는 경우일 수 있다고 알린다. 토큰 값은 출력하지 않는다.

## 출력

확인 범위(PR, 읽은 diff, 호출한 reviewer, 기존 thread 확인 여부), 게시 후보 코멘트(파일:줄, 본문), 제외한 항목과 이유, 검증 공백, 게시 여부(게시했다면 PR URL, 하지 않았다면 하지 않았다고)를 쓴다.

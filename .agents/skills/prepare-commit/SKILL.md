---
name: prepare-commit
description: 현재 변경을 검토해 저장소 규칙에 맞는 한국어 Conventional Commit 계획과 명령을 제안한다. 코드 변경이면 계획 전에 reviewer agent로 리뷰한다. 사용자가 승인하면 계획대로 커밋까지 수행한다. 사용자가 커밋 준비 또는 메시지 작성을 요청할 때 사용한다.
---

# 커밋 준비

## 목표

변경 목적, 리뷰 표면, 되돌림 단위, 검증 근거가 같은 파일만 한 커밋으로 묶는다. 기본은 커밋 계획과 명령을 제안하는 것이고, 사용자가 실행해도 된다고 명시적으로 승인한 경우에만 이 skill이 직접 커밋한다. push는 하지 않는다.

## 읽기와 입력 점검

1. `docs/conventions/git.md`의 agent 실행 기준, `docs/conventions/commit.md`, 현재 branch, `git status --short --branch`, `git diff`, `git diff --staged`를 확인한다.
2. Git 정보를 읽을 수 없으면 변경 파일 목록과 사용자의 목적을 기준으로 계획임을 명시한다.
3. secret, `.env*`, lockfile, generated output, 다른 작업의 untracked 파일을 명시적으로 포함/제외 판단한다.
4. staged 변경과 unstaged 변경을 별도 surface로 보고, 한쪽을 다른 쪽의 근거로 가정하지 않는다.

## 리뷰 게이트

커밋 계획을 제안하기 **전에** 변경을 독립적으로 한 번 검토한다. 이 skill이 직접 리뷰하지 않고(작성과 승인을 같은 맥락에서 하지 않는다) 읽기 전용 reviewer agent를 호출한다.

1. 코드 변경이 있으면 `bunch-reviewer`(Claude Code는 `.claude/agents/`, Codex는 `.codex/agents/`)에게 현재 diff를 맡긴다. `docs/agent/bootstrap.md`의 "필수 호출 기준"에 해당하는 변경(route·API 계약·UI)은 해당 전용 reviewer도 호출한다.
2. 문서 전용 변경, 오탈자, 한 파일의 사소한 조정은 호출하지 않고 계획에 "리뷰 생략(이유)"를 적는다.
3. `Critical`·`Major`가 있으면 커밋 계획을 확정하지 않는다. 결과를 보여 주고, 고친 뒤 다시 호출하거나 사용자가 문제없다고 확인한 경우에만 계획을 낸다.
4. `Minor`·`Suggestion`은 계획의 "미검증 위험"에 함께 적는다. 단순화 제안은 보고만 하고 적용하지 않는다.
5. 마지막 리뷰 이후 변경이 있으면 다시 호출한다. 실제로 호출하지 않았다면 호출했다고 쓰지 않는다.

## 묶음 판단

아래 중 하나라도 다르면 커밋 분리를 우선 제안한다.

- 이슈 또는 사용자 목적
- reviewer가 확인할 영역
- independent revert 가능성
- 필요한 test·build·manual 검증
- code와 단순 formatting·generated output의 성격

권장 순서는 문서/규칙 → scaffold → data/API → 화면/interaction → test → 정리다. 단, 같은 동작을 완성하는 code와 test는 함께 둔다.

각 파일은 정확히 한 커밋에만 배정한다. 여러 커밋으로 나눌 때는 출력 전에 파일이 두 커밋에 겹치지 않는지 한 번 더 확인한다.

## 메시지 규칙

```text
<type>: <subject>
<type>(<scope>): <subject>
```

| type             | 사용할 때                     |
| ---------------- | ----------------------------- |
| `feat`           | 새 사용자 기능                |
| `fix` / `hotfix` | 버그 또는 긴급 수정           |
| `refactor`       | 동작 보존 구조 개선           |
| `remove`         | 파일 삭제                     |
| `rename`         | 파일·폴더 이름 변경, 이동     |
| `test`           | 테스트만 변경                 |
| `docs`           | 문서·agent 지침               |
| `style`          | 동작 없는 UI/format 변경      |
| `chore`          | build, package, CI, 보조 설정 |

- scope는 기본적으로 쓰지 않는다. 변경이 한 영역(`web`, `admin`, `design-system`, `api-core`, `bridge`, `ci` 등)에 한정될 때만 쓰고, 여러 영역에 걸치거나 분명하지 않으면 쓰지 않는다.
- subject는 한국어 명사형 또는 요약형, 50자 내외, 마침표 없음으로 작성한다.
- 파일명·AI 출처·검증하지 않은 동작을 subject에 넣지 않는다.
- issue close 문구는 커밋이 아니라 PR 본문의 `Close #번호`에 둔다.

## 출력 형식

````markdown
## Commit Plan

### Commit 1 — type: 한국어 요약

- 포함: `path/...`
- 이유: 독립적인 변경 목적
- 검증: `yarn ...`

```bash
git add -- path/...
git commit -m "type: 한국어 요약"
```
````

경로에 `(`, `)`, `[`, `]`, 공백이 있으면(Next.js route group `(site)`, 동적 route `[id]`) `git add -- "apps/web/src/app/(site)/page.tsx"`처럼 큰따옴표로 감싼다. 감싸지 않으면 zsh가 glob으로 해석해 add가 실패한다. 존재하는 경로만 넣고, 불확실한 경로를 추측해 넣지 않는다.

마지막에 리뷰 결과(호출한 reviewer와 `Critical`·`Major`·`Minor` 개수, 또는 생략 이유), 제외한 파일, 커밋 전 실행할 `git diff --cached --check`, 미검증 위험을 적는다.

## 실행

1. 기본 결과는 계획과 명령이다. 이를 보여 준 뒤 "이 계획대로 커밋할까요?"를 사용자에게 묻는다. 사용자가 "명령만"·"초안만"을 요청하면 묻지 않는다. 실행 질문에 긍정한 경우에만 해당 계획을 실행한다. 이미 같은 계획을 승인했다면 다시 묻지 않고, 계획이 바뀌면 새 범위를 보여 주고 승인을 받는다. 규칙이나 설명에 동의한 답변은 실행 승인으로 보지 않는다.
2. git 저장소이고 `git status`를 읽을 수 있을 때만 실행한다. 읽을 수 없으면 제안만 한다. 커밋은 로컬 작업이라 `gh` 인증은 필요 없다.
3. 승인되면 계획 순서대로 `git add -- <경로>`(경로를 하나씩) → `git diff --cached --name-only`와 `git diff --cached --check`로 범위 확인 → `git commit -m`을 실행한다. 다른 작업의 파일은 어느 커밋에도 넣지 않고 따로 알린다.
4. `pre-commit`·`commit-msg` hook이 실패하면 원인을 보고 고친 뒤 새로 커밋한다. `--no-verify`로 우회하지 않는다.
5. 끝나면 `git log --oneline`과 `git show --stat`으로 범위 밖 파일이 없는지 확인해 보고한다. push는 하지 않고, 필요하면 `prepare-pull-request`를 안내한다.

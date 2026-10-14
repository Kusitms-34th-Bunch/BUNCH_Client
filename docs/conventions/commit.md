# Commit Rules

`commitlint.config.mjs`의 Conventional Commits 규칙을 따른다.

```text
<type>: <subject>
<type>(<scope>): <subject>
```

- `scope`는 기본적으로 쓰지 않는다. 변경이 한 영역(`web`, `admin`, `design-system`, `api-core`, `bridge`, `ci` 등)에 한정될 때만 그 이름을 쓴다. 여러 영역에 걸치거나 영역이 분명하지 않으면 쓰지 않는다.
- subject는 변경 내용을 간결한 명사형 또는 요약형으로 작성하고 마침표를 붙이지 않는다.
- 본문에는 필요한 경우 변경 이유나 주의 사항을 짧은 bullet로 적는다.
- 이슈를 닫는 문구는 PR 본문에 `Closes #123` 형식으로 적는다.
- 커밋 메시지와 PR 본문 어디에도 `Co-Authored-By: Claude …`, `Generated with Claude Code` 같은 AI 출처 문구를 넣지 않는다. `commitlint`(`no-ai-attribution`)와 agent용 `guard-rules.mjs`가 막는다.

| type       | 용도                     |
| ---------- | ------------------------ |
| `feat`     | 기능 추가                |
| `fix`      | 버그 수정                |
| `docs`     | 문서 변경                |
| `style`    | 포맷 또는 UI 스타일 변경 |
| `refactor` | 동작 변경 없는 구조 개선 |
| `test`     | 테스트 추가 또는 수정    |
| `chore`    | 설정, 빌드, 패키지 관리  |
| `hotfix`   | 긴급 수정                |

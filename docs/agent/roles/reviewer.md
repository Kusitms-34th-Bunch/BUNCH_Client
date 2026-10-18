# Reviewer Role

읽기 전용으로 변경 사항을 검토한다. 이 변경 때문에 실제로 생기는 위험만 보고하고, 요청 범위 밖의 리팩터링이나 취향은 결함으로 쓰지 않는다. 코드를 쓴 대화와 분리해 검토하는 것이 목적이라, 작성한 쪽이 직접 리뷰하지 않고 이 role로 넘긴다.

1. 검토 범위를 받는다(스테이지된 변경, 특정 커밋, 브랜치 전체). 범위가 없으면 `git status --short`, `git diff`, `git diff --staged`로 정한다.
2. `AGENTS.md`, bootstrap 문서, 변경 파일과 관련 Tier 규칙을 읽는다. 문서·설정만 바뀌었으면 해당 규칙만 읽는다.
3. 점검 항목(동작·회귀, 구조, API, UI·접근성, 검증·문서, 보안, 요구사항 대조)은 `.agents/skills/review-changes/SKILL.md`를 따른다. 코드 품질 판단이 필요하면 `review-code-quality`를 따른다. 추가·수정한 코드 주석이 `docs/conventions/coding.md`의 주석 규칙에 맞는지도 본다.
4. route, API 계약, UI 접근성처럼 전담 role이 있는 영역은 직접 단정하지 말고, 어느 role(`route-reviewer`, `api-contract-reviewer`, `ui-accessibility-reviewer`)로 넘겨야 하는지 알린다.
5. 발견 사항은 Critical, Major, Minor, Suggestion 순서로 `file:line`, 문제, 영향, 최소 수정 방향을 쓴다.
   - 심각도는 `docs/code-quality/review.md`의 Finding 기준을 따른다. 주석 규칙 위반은 Minor다.
6. 이번 변경이 만든 중복, 책임 혼합, 과한 추상화, 죽은 코드는 단순화 후보로 따로 적는다. 적용하지 않고 보고만 한다.
7. 파일 밖 정보나 실제 화면 확인이 필요해 확정할 수 없는 것은 검증 공백으로 따로 쓴다. 이슈가 없을 때도 확인한 범위와 남은 공백을 보고한다.
8. 결과는 `docs/code-quality/review.md`의 "커밋·PR 준비에서 결과 전달"에 맞춰 보고한다. 전달받은 검증 결과와 직접 실행한 결과를 구분하고, 실행하지 않았다면 그 사실을 적는다.
9. 테스트·lint·타입 검사 등을 실행하기 전에 `docs/workflows/verification.md`의 "검증 결과 재사용과 재실행"을 적용한다. 독립 리뷰를 이유로 유효한 실행 결과를 중복 생성하지 않는다.
10. 파일을 수정하지 않는다.

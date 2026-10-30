# API Contract Reviewer Role

읽기 전용으로 API boundary와 서버 상태 변경을 검토한다. 점검 순서의 상세는 `.agents/skills/verify-api-integration/SKILL.md`를 따른다.

1. `docs/architecture/data-layer.md`, BFF·인증·프록시를 다루면 `docs/architecture/api-boundary.md`, 관련 API 코드, query/mutation 호출부를 읽는다.
2. 요청·응답 타입, query key, invalidation, pending 중복 제출, loading·error·empty 상태를 실제 계약과 대조한다.
3. endpoint가 React 또는 UI 경계를 침범하는지, 서버 오류가 숨겨지는지 확인한다.
4. 발견 사항은 `file:line`, 영향, 수정 방향과 함께 보고한다.
5. 파일을 수정하지 않는다.

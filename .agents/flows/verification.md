# 검증 흐름

1. 변경 diff와 대상 workspace를 확인하고 `docs/workflows/verification.md`의 최소 검증을 고른다.
2. formatting, 경로·생성물 검사, targeted test처럼 빠른 검증을 먼저 실행한다.
3. 성공하면 lint, typecheck, 대상 build, 필요한 E2E로 범위를 넓힌다.
4. 실패하면 command, 원인, 영향, 재현 조건을 기록한다. 수정하지 않는 검증 작업이면 원인만 보고한다.
5. 실행할 수 없는 검증은 명령과 이유를 `미실행`으로 기록한다.
6. 최종 보고에는 실제 실행 결과, 수동 확인, 남은 위험을 구분한다.

전체 영향이 크거나 release 전 요청된 경우에만 `yarn verify`를 실행한다.

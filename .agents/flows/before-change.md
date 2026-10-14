# 변경 전 흐름

1. `AGENTS.md`와 `docs/agent/bootstrap.md`를 읽고 작업 유형을 분류한다.
2. 대상 app/package의 `AGENTS.md`, 가까운 source·test·spec·package script를 확인한다.
3. 현재 구현과 사용자 요청이 충돌하면 코드와 문서 중 어느 것이 source of truth인지 확인한다.
4. route, API 계약, 권한, 외부 credential, destructive migration처럼 추측 비용이 큰 입력이 빠졌는지 확인한다.
5. 변경 범위, 보존할 동작, 필요한 문서·test·검증을 정한다.
6. 다른 사용자 변경을 발견하면 되돌리지 않고 scope에서 분리한다.

작은 수정은 이 흐름을 짧게 적용한다. 새 구조·package·library·장기 제약을 만들면 `docs/decisions/README.md`의 기록 필요성도 판단한다.

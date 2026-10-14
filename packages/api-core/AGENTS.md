# API Core Workspace

Root `AGENTS.md`와 `docs/architecture/data-layer.md`를 먼저 따른다. 이 패키지는 transport와 공유 API 계약만 소유한다.

- UI, route, toast, analytics 같은 앱 표현 계층을 import하지 않는다.
- public consumer는 `package.json`의 `exports`만 사용한다. 새 public API는 export와 생성·검증 영향을 함께 확인한다.
- OpenAPI 생성 타입은 `src/generated/`에 두고, 생성 규칙은 `docs/workflows/api-integration.md`를 따른다.
- 검증은 변경 범위에 맞춰 `yarn workspace @app/api-core test`, `lint`, `typecheck`를 선택한다.

# Web Workspace

Root `AGENTS.md`와 `docs/agent/bootstrap.md`를 먼저 따른다. 이 문서는 Next.js web 앱의 추가 경계만 정의한다.

- `src/app`은 route, layout, metadata, provider 조립을 담당한다.
- 화면·feature 로직은 `src/features`, 공용 인프라는 `src/shared`에 둔다. `shared`는 feature와 route를 import하지 않는다.
- browser code와 server-only code를 섞지 않는다. secret, cookie, server 전용 의존성을 client bundle에 넣지 않는다.
- 검증은 변경 범위에 맞춰 `yarn workspace @app/web test`, `lint`, `typecheck`, `build` 중 필요한 명령을 선택한다.

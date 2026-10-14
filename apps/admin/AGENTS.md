# Admin Workspace

Root `AGENTS.md`와 `docs/agent/bootstrap.md`를 먼저 따른다. 이 문서는 Vite + TanStack Router admin 앱의 추가 경계만 정의한다.

- `src/routes`는 파일 기반 route 정의와 route-level 설정만 담당한다.
- 화면 조립은 `src/pages`, 사용자 행동 단위 로직은 `src/features`, API는 `src/api`, 앱 공용 UI는 `src/components`에 둔다.
- route loader와 component query의 책임을 섞지 않는다. 필요한 prefetch는 route 수준에서 의도를 드러낸다.
- 검증은 변경 범위에 맞춰 `yarn workspace @app/admin test`, `lint`, `typecheck`, `build` 중 필요한 명령을 선택한다. 사용자 흐름 변경은 root `e2e/` 영향도 확인한다.

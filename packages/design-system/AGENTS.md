# Design System Workspace

Root `AGENTS.md`와 `docs/architecture/design-system-components.md`를 먼저 따른다. 이 패키지는 Figma에 정의된 UI 컴포넌트와 token을 소유하고, 조합은 앱의 `features`가 맡는다.

- app route, API, domain business rule, 앱 전용 layout을 import하거나 public API에 포함하지 않는다.
- 새 컴포넌트는 재사용 계약, 접근성 상태, public export, story와 test 필요성을 함께 검토한다.
- public export 또는 생성 index에 영향이 있으면 `yarn check:generated`를 실행한다.
- 검증은 변경 범위에 맞춰 `yarn workspace @app/design-system test`, `lint`, `typecheck`, `build-storybook` 중 필요한 명령을 선택한다.

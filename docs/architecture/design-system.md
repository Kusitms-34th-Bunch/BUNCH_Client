# Design System Rules

- 새 컴포넌트는 `yarn gen:ds-component`로 생성해 component, test, Storybook story, export 흐름을 맞춘다.
- 새 구현 전에 기존 `@app/design-system` 컴포넌트와 아이콘을 먼저 확인한다.
- package는 token, framework-agnostic React UI, 필요한 utility와 public export만 제공한다. route, API request, analytics, domain state, 제품 copy는 app에 남긴다.
- 앱에서 반복되는 UI여도 business rule이나 route 문맥을 가지면 디자인 시스템으로 올리지 않는다.
- 컴포넌트 API는 작고 명시적으로 유지한다. 반복되는 boolean 조합보다 variant나 slot composition을 우선 검토한다.
- `className`, ref, disabled, label 등 consumer에게 필요한 기본 확장 지점은 실제 사용 사례가 있을 때 제공한다.
- Figma의 variant, size, tone, state는 명시적인 prop으로 표현하되 화면별 문구, API 흐름, 제품 정책은 공용 컴포넌트에 고정하지 않는다.
- disabled, loading, invalid, selected 같은 상태는 시각 표현과 접근성 속성을 함께 설계한다.
- 새 도구나 의존성은 실제 설치·설정·검증이 같은 변경에 포함될 때만 현재 표준으로 취급한다.
- public export 변경 뒤에는 `yarn check:generated`를 실행한다.
- 구현·test·story·local index·root export는 같은 변경에서 함께 관리한다. 생성된 index와 public entry를 직접 임시 수정하지 않는다.

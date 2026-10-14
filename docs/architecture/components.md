# Component Rules

## 배치

- 기존 디자인 시스템, 앱 공용 컴포넌트, feature-local UI 순으로 재사용 가능성을 확인한다. 새 공용 컴포넌트는 기존 API로 해결할 수 없을 때만 만든다.
- route 또는 domain 문맥을 아는 UI는 해당 앱의 `pages`, `features`, `domains` 가까이에 둔다.
- 두 곳 이상에서 같은 UI 구조가 실제로 필요하고 app 문맥이 없을 때만 `components` 또는 `shared/components`로 올린다.
- 여러 앱에서 재사용할 React UI primitive와 token만 `@app/design-system`에 둔다.
- route shell과 앱 전용 layout은 디자인 시스템으로 올리지 않는다.
- 디자인 시스템은 interaction state와 접근성 계약을, 앱은 페이지 layout·route·데이터 흐름·제품 문구를 책임진다.

## API와 조합

- 컴포넌트는 작고 명시적인 prop API를 유지한다.
- 조건을 바꾸는 boolean prop이 늘어나면 `variant`, slot, composition 중 더 읽기 쉬운 형태를 선택한다.
- 구조는 컴포넌트가 책임지고, 호출자가 바꿔야 하는 제한된 위치만 slot prop으로 연다.
- slot이 과도하게 늘거나 하위 요소의 상태·접근성 관계가 강하면 compound component를 검토한다.
- `className`, ref, native element prop은 실제 consumer 확장 사례가 있을 때만 노출한다.
- Figma의 좌표나 화면별 copy를 그대로 공용 API로 만들지 않는다. 재사용 가능한 variant, state, layout 계약으로 바꿀 수 있는지 먼저 본다.

## 접근성과 스타일

- 클릭·제출·이동에는 의미에 맞는 native element를 사용한다.
- 아이콘 전용 button에는 접근 가능한 이름을 제공하고, form control은 label과 연결한다.
- 색상·간격·타이포그래피는 앱 또는 디자인 시스템의 token·utility를 우선 사용한다.
- 컴포넌트의 loading, disabled, error, empty 상태가 사용자에게 보이는 경우 해당 상태를 API와 테스트에 포함한다.
- dialog, drawer처럼 focus 흐름이 중요한 UI는 focus management를 보장하는 primitive 또는 검증된 구현을 사용한다.
- 색상만으로 상태를 전달하지 않는다. 긴 텍스트와 좁은 viewport에서도 overflow나 layout shift가 과하지 않은지 확인한다.
- 한글 텍스트는 글자 잘림, 어색한 지점에서의 줄바꿈, 조사가 다음 줄로 혼자 넘어가는 고아 현상, 지나치게 작은 글씨를 시각 확인 항목에 포함한다. 이 중 하나라도 있으면 시각 QA를 통과로 표시하지 않는다.

## 파괴적 액션 확인

- 판단 기준: 사용자가 실수로 클릭했을 때, 지원팀 없이 30초 안에 되돌릴 수 있는가?
- **되돌릴 수 없는 액션**(영구 삭제, 초기화, 취소 불가능한 제출)은 대상 이름처럼 화면에 보이는 문자열을 직접 입력해야 진행 버튼이 활성화되는 확인 UI를 사용한다.
- **되돌릴 수 있는 액션**(비활성화, 숨기기, 임시 상태 변경)은 단순 confirm(팝오버 또는 다이얼로그)으로 충분하다.
- soft-delete·휴지통처럼 보이는 흐름도, 사용자가 스스로 복구 경로에 도달할 수 없다면(관리자 개입이나 DB 조작이 필요하면) 되돌릴 수 없는 액션으로 취급한다.
- 입력받는 확인 문자열은 사용자가 화면에서 그대로 보고 옮겨 적을 수 있는 값(이름 등)을 쓰고, 의미 없는 토큰을 요구하지 않는다.

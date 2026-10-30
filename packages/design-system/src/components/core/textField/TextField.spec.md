# 컴포넌트: TextField

## 메타데이터

- 소유 경계: design-system `core`(모든 앱이 쓴다).
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기·스크린 리더 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `TextField`(node `720:3803`). 변형(`varient`, Figma 철자) 3종 × 상태 5종이고, 이를 조합한 `Labled_Text_Field`(node `796:4808`)는 `web`의 `LabeledTextField`다.

## 목적과 범위

### 제공하는 동작

- 한 줄 입력창. `label`이 접근성 이름이고 나머지 props는 native `input`에 전달된다.
- 변형 3종은 props로 고른다.
  - 기본: `action`·`onClear` 없음. 지우기·버튼이 없다.
  - 지우기(Figma `Delete`): `onClear`를 주면 오른쪽에 지우기 버튼이 모든 상태에서 보인다. 누르면 `onClear`를 호출하고 입력창으로 포커스가 돌아간다(값 비우기는 호출자).
  - 버튼(Figma `Button`): `action`에 넘긴 영역을 오른쪽에 둔다(예: `Button variant="brandSubtle" size="sm"`).
- 상태 5종은 입력 상태와 `editing` prop으로 표현한다.
  - `Default`: 값 없음·포커스 없음(placeholder).
  - `Focused`: 입력 영역(`focus-within`)에 포커스. 강한 테두리로 바뀌고 안내 문구가 사라져 캐럿만 보인다.
  - `Filled`: 값이 있다.
  - `Editing`: `editing` prop. 입력창 내용을 가리고 점 3개 애니메이션을 보인다. 입력값은 유지된다.
  - `Disabled`: `disabled`. 입력창 전체가 `opacity-disabled`(40%)가 된다. 지우기 버튼이 있으면 같이 흐려지고 누를 수 없다.

### 제공하지 않는 동작

- 여러 줄 입력(`textarea`)은 `LabeledTextArea`가 맡는다.
- `Editing`을 켜는 시점(로딩·입력 중 표시 등)은 정하지 않는다. 호출하는 쪽이 `editing`을 준다.
- 입력 검증, 글자 수 제한 표시, 오류 문구는 `LabeledTextField`와 호출하는 쪽이 맡는다.

## Public API

- Props: `label`(필수, 접근성 이름), `action`, `onClear`, `clearLabel`(기본 「입력 지우기」), `editing`, `disabled`, `value`·`onChange`·`placeholder`(기본 「글, 제목, 내용을 입력해주세요.」) 등 native `input` 속성(`type`·`size`·`ref`·`aria-label` 제외).
- `className`은 입력창 바깥 행에 적용된다.
- 호출자 소유 책임: 값과 `onClear` 처리, 버튼 영역의 동작·접근성 이름.

## 상태와 동작

| 상태       | 테두리                                   | 비고                                           |
| ---------- | ---------------------------------------- | ---------------------------------------------- |
| `Default`  | `border-secondary`                       | placeholder                                    |
| `Focused`  | `border-strong`(`focus-within`)          | 안내 문구 숨김                                 |
| `Filled`   | 지우기 변형만 강한 테두리, 나머지는 기본 | Figma `Delete`의 `Filled`만 강한 테두리        |
| `Editing`  | 지우기 변형만 강한 테두리, 나머지는 기본 | 점 3개(아래), 입력창은 `opacity-0`·`aria-busy` |
| `Disabled` | `border-secondary`                       | 전체 40% 투명                                  |

- `Editing` 점: 지름 약 3px, 색 `icon-quaternary`(`#bcbec2`), 10px 간격, 1.6초 주기로 투명도 0.3에서 1, 크기 1.22배에서 1.63배, 점 사이 시차 약 0.33초. 값은 Figma 모션 정보와 렌더 측정에서 옮겼다. 동작 줄이기 설정에서는 움직이지 않고 정지한 모양을 보인다.
- 지우기 버튼은 `readOnly`면 숨긴다(Figma에 없는 상태). 비활성이면 보이지만 누를 수 없다.
- 긴 값은 입력창에서 한 줄로 잘린다.
- iOS WebKit에서는 입력 텍스트를 16px로 렌더링하고 0.875배 축소해 14px 디자인을 유지한다(`inputScale.module.css`).

## 접근성

- 입력창은 native `input`이고 `aria-label`로 `label`을 이름으로 갖는다.
- 지우기 버튼은 `aria-label`(`clearLabel`)이 이름이고 아이콘은 장식이다. 터치 영역 40px. 마우스를 누르는 동안 입력창 포커스가 빠지지 않게 `mousedown`을 막는다(Safari·터치).
- `editing` 동안 입력창에 `aria-busy`를 걸고 점은 `aria-hidden`이다. 진행을 말로 알리지는 않는다.
- 강제 색상 모드에서는 테두리 색 변화가 사라질 수 있어 2px 시스템 색 윤곽선을 추가한다.

## Styling과 의존성

- Token: `gap-s2`, `rounded-r5`, `border-border-secondary`, `bg-surface-primary`, `pl-padding-p8`, `py-padding-p5`(버튼 변형은 `p3`), `fieldText`(입력값 `typography-body-2-regular`·`text-primary`, placeholder는 Body-2-Meduim의 굵기·자간(SemiBold, -0.5px)만 덧붙이고 크기·행 높이는 input에서 상속·`text-quaternary`. 2026-10-22 Figma 변경으로 placeholder만 SemiBold. 크기까지 지정하면 iOS 축소 보정이 두 번 적용됨), `--semantic-opacity-disabled`, `--semantic-icon-quaternary`.
- `border-strong` semantic 토큰이 아직 원본에 없어 같은 값인 `primitive-gray-700`(#25282d)을 쓴다. 토큰 동기화 뒤 교체한다.
- dependency 추가 없음.
- Storybook state matrix: 기본·지우기·버튼 3종 × `Default`·`Focused`·`Filled`·`Editing`·`Disabled`(기본은 접두어 없이, 나머지는 `Clear*`·`Button*`).

## 확인할 항목

- `Editing`의 의미 (확인): Figma는 점 애니메이션만 보여 주고 켜는 조건을 정의하지 않는다. 로딩·입력 중 표시 중 무엇인지 디자이너 확인이 필요하다. 지금은 `editing` prop으로만 켠다.
- `Editing`의 테두리 (제안): Figma가 `Editing`에서 지우기 변형만 강한 테두리를 쓰고 기본·버튼 변형은 기본 테두리라서 그대로 옮겼다. 의도한 규칙인지 확인이 필요하다.
- 지우기 변형의 빈 값 (확정, Figma): 값이 없어도 지우기 버튼이 보인다. 누르면 `onClear`만 호출한다.
- `Editing` 안내 (제안): 점은 `aria-hidden`이고 `aria-busy`만으로는 상태가 거의 읽히지 않는다. `editingLabel`을 주면 `role="status"` 문구로 읽는다(화면에는 안 보임). 문구는 호출하는 쪽이 정한다. 입력은 `editing` 중에도 계속 가능하고 내용만 가려지니, 입력을 막으려면 호출하는 쪽이 `readOnly`를 함께 준다.
- 지우기 변형의 강한 테두리 (디자이너 확인): 값이 있으면 포커스 없이도 포커스와 같은 색이라 활성 필드와 구분되지 않을 수 있다. Figma 값을 따랐다. 값이 있는 비활성은 기본 테두리다.
- 지우기 변형의 제약 (확정): 값이 있을 때의 강한 테두리는 `value`를 주는 controlled 입력에서만 켜진다. 비제어 입력은 값을 비울 방법이 없어 지우기 변형을 쓰지 않는다.
- 텍스트 대신 점 (제안): `editing` 동안 입력창은 투명하게 두어(`opacity-0`) 포커스·값은 유지한다. 이 동안 입력하면 내용이 보이지 않는다.

## 검증

- [x] 사용자 관찰 동작 test 작성(`TextField.test.tsx`): 변형별 지우기 버튼, 포커스 복귀, `readOnly`·`disabled`, 강한 테두리 조건, `editing`, 투명도
- [x] 지원 변형·상태 story 작성(15개)
- [x] 실행 command와 결과: `yarn workspace @app/design-system test`·lint·typecheck
- [x] Storybook 렌더를 헤드리스 Chromium(15개 story)으로 Figma와 대조: 테두리 색(기본 `#e1e2e5`, 포커스·지우기 변형의 Filled·Editing `#25282d`), 비활성 투명도 0.4, 지우기 버튼 유무가 일치하고 `Editing` 점 중심 위치(x 21·31.5·42.5, 세로 중앙)가 Figma와 1px 안쪽으로 맞는다. 점 애니메이션이 실제로 도는 것(투명도 변화, 점 사이 시차)과 동작 줄이기에서 정지하는 것도 측정했다
- [ ] 실기기·iOS WebKit·스크린 리더·강제 색상 모드 확인은 하지 않았다

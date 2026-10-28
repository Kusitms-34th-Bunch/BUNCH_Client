# 컴포넌트: SelectionField

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Selection Field`(node `1303:15403`). 변형은 `State=Default·Selected` × `Suggestion=True·False` 중 3개(Default+Suggestion, Default, Selected)다.
- 조합하는 컴포넌트: 제목 줄은 `BundleTitle`(`web/bundleTitle`, 위치 핀·제목·필수 별표), 추천 칩은 `ChipButton`(`web/chipButton`). 아이콘은 `LineChevronRightMediumIcon`·`LineCloseMediumIcon`(기존). 위치 핀 아이콘은 `BundleTitle`이 쓴다.

## 목적과 범위

### 제공하는 동작

- 값을 고르러 가는 한 줄 필드. 위치 핀, 제목(선택 전 안내 문구 또는 선택한 값), 필수 별표, 오른쪽 아이콘(선택 전 화살표, 선택 뒤 지우기)으로 이뤄진다.
- 선택 전에 아래에 추천 값을 칩 버튼으로 보여 줄 수 있다(`Suggestion=True`).

### 제공하지 않는 동작

- 값을 고르는 화면(바텀시트·검색 등), 선택 값의 보관은 만들지 않았다. 호출하는 쪽이 `onFieldClick`·`onSuggestionClick`·`onClear`로 처리한다.
- 선택된 상태의 추천 값은 Figma에 없다(`Selected`는 `Suggestion=False`만 있다).
- 눌림·호버·비활성·오류 모양은 Figma에 없어서 만들지 않았다.
- 추천 칩은 `ChipButton`의 `size="M"`(Solid·Default, 아이콘 없음)을 쓴다. 선택 필드의 칩에는 Figma 호버 모양이 따로 없지만 `ChipButton`의 호버(검정 10% 오버레이)가 그대로 적용된다.

## Public API

- Props: `label`(필수, 제목 글자), `fieldLabel`(어떤 필드인지 알려 주는 이름, 화면에는 안 보이고 버튼 이름 앞에 붙음), `selected`(기본 `false`), `required`(별표, 기본 `false`), `requiredLabel`(기본 "필수"), `suggestions`(추천 값 배열), `suggestionsLabel`(기본 "추천"), `onFieldClick`, `onSuggestionClick(추천 값)`, `onClear`, `clearLabel`(기본 "{label} 지우기"), 그리고 native `<div>`의 속성(`className`은 카드에 적용).
- 값의 보관은 호출하는 쪽이다: 선택 전에는 `label`에 안내 문구, 선택 뒤에는 `label`에 선택한 값과 `selected`를 준다.
- 호출자 소유 책임: 안내 문구·추천 값·접근성 이름의 i18n, 값을 고르는 동작, 필드 이름(`fieldLabel`). 추천 칩을 누르거나 지우기를 눌러 상태가 바뀌면 눌렀던 요소(칩 목록·지우기 버튼)가 사라져 포커스가 `body`로 떨어지므로, 키보드 사용자가 길을 잃지 않게 호출하는 쪽이 필드 버튼 등으로 포커스를 옮겨 준다(이 컴포넌트는 `ref`를 노출하지 않는다). 긴 제목은 한 줄로 잘리고 시각으로 전체를 볼 방법이 없다(스크린 리더는 전체를 읽는다).

## 상태와 동작

- 카드: 흰 배경(`surface-primary`), 1px `border-tertiary`(`#EAEAEA`) 테두리, 반경 `r5`(10px), 좌우 여백 14px(`s7`), 폭은 부모를 채운다(Figma 376px).
- 한 줄(추천 없음): 세로 여백 10px(`s5`), 높이 46px. 핀(16px, `icon-primary`) + 제목 + 별표가 왼쪽, 아이콘이 오른쪽(Default는 화살표, Selected는 지우기 20px).
- 추천 있음: 세로 여백 16px(`s8`), 높이 104px. 위 줄(제목 + 화살표) 아래 10px 띄워 추천 칩이 가로로 놓인다. 칩은 `ChipButton` M(높이 36px, 좌우 10px, 원형, 배경 `surface-secondary`, 글자 14/21 `text-tertiary`)이고 칩 사이 6px(`s3`)이다. 줄이 넘치면 줄바꿈한다.
- 제목: `typography-body-2-meduim`(14/21, 600, 자간 -0.5px — 이름은 철자 오류지만 값이 Figma Body-3-SemiBold와 같다), `text-secondary`(`#25282D`). 길면 한 줄로 줄인다.
- 별표: `icon-brand`(`#454EDF`) 16px, 스크린 리더에는 숨기고 "필수"를 따로 읽어 준다.
- 필드 전체(여백 포함)가 눌리도록 필드 버튼은 카드 전체를 덮는 빈 버튼(`absolute inset-0`)이다. 추천 칩과 지우기 버튼은 그 위(`z-10`)에 있어 따로 눌린다. 추천 칩 줄의 빈 영역도 클릭이 필드 버튼으로 통과한다(`ul`은 `pointer-events-none`, 칩만 `pointer-events-auto`).

## 접근성

- Semantic element: 필드는 native `<button type="button">`, 지우기와 추천 칩도 `<button>`이고 추천은 `<ul aria-label>` 안의 `<li>`다. `BundleTitle`이 `<div>`라 버튼 안에 넣으면 유효하지 않은 HTML이 되므로, 필드 버튼은 내용이 없는 빈 버튼으로 카드 전체를 덮고 `aria-labelledby`로 제목(`BundleTitle`)을 가리킨다. 지우기와 칩은 이 버튼의 형제다.
- Accessible name·label: 필드는 `aria-labelledby`로 `fieldLabel`(있으면, 화면에는 안 보이는 글자) + `BundleTitle`(제목 글자 + "필수" 안내)을 가리켜 이름이 만들어진다(예: "위치: 서울특별시 여의도동 필수"). `aria-label`을 루트 `<div>`에 주어도 버튼 이름이 바뀌지 않으므로 필드 이름은 `fieldLabel`로 준다. 지우기는 "{label} 지우기", 칩은 값 글자이고 아이콘은 모두 `aria-hidden`이다. 추천 `<ul>`은 저장소 lint 규칙(`jsx-a11y/no-redundant-roles`)상 `role="list"`를 명시하지 않아, Tailwind의 `list-style: none`에서 Safari VoiceOver가 목록 의미를 읽지 않을 수 있다(스크린 리더 확인 필요). 제목(`BundleTitle`)과 `fieldLabel` 글자는 이름으로만 읽히도록 `aria-hidden`을 주어 가상 커서에서 같은 문구가 두 번 읽히지 않게 했다(`aria-labelledby`는 숨겨진 요소도 이름에 쓴다). 실제 스크린 리더에서 이름이 유지되는지는 검증 전이다.
- Keyboard·focus: Tab 순서는 필드 → (선택 전) 추천 칩들, (선택 후) 지우기다. 필드 포커스는 카드 바깥 2px `border-brand` 윤곽선이고 칩·지우기는 각자 둘레에 보인다.
- 터치 영역: 지우기 버튼은 보이는 20px에 터치 영역 40px(Medium 기준)이다. 칩은 36px 높이에 `ChipButton`이 위아래로 터치 영역을 넓힌다. 칩이 줄바꿈되면 위아래 칩의 터치 영역(칩마다 위아래 4px)이 칩 사이 6px 간격과 약 2px 겹칠 수 있고, 겹친 부분은 DOM에서 뒤에 있는 칩이 받는다.
- 색 대비(토큰 hex로 계산): 제목 `#25282D` on `#FFFFFF` 14.8:1, 칩 글자 `#535A61` on `#F5F5F5` 6.4:1로 통과한다. 카드 테두리 `#EAEAEA` on `#FFFFFF`는 1.2:1로 비텍스트 대비 3:1에 못 미친다(Figma 값, 확인할 항목).

## Styling과 의존성

- Token: `bg-surface-primary`·`bg-surface-secondary`, `border-border-tertiary`, `rounded-r5`, `px-s7`·`py-s5`·`py-s8`·`gap-s5`·`gap-s4`·`gap-s2`·`gap-s1`·`gap-s3`·`text-icon-primary`. 제목·별표·칩의 글자와 색은 `BundleTitle`·`ChipButton`의 token을 따른다. dependency 추가 없음.
- Figma 이름 대응: `State=Default·Selected`→`selected`, `Suggestion=True`→`suggestions`, `suggest1~3`→`suggestions` 배열, 제목 글자→`label`.
- Storybook state matrix: `Default`, `Selected`, `WithSuggestions`, `NotRequired`, `LongLabel`, `Interactive`.

## 확인할 항목

- 별표는 Figma에서 `Wanted Sans Variable` 16/22(자간 -0.17px)이지만 repo에 이 글꼴이 없어 Pretendard `typography-body-1-semi-bold`(16/24, 자간 -0.25px)로 그렸다. 디자이너 확인이 필요하다.
- 카드 테두리 대비(위 접근성 항목).
- 별표를 항상 보여 주는 것이 Figma의 모든 변형이라 `required`의 기본값을 `false`로 두었다(화면이 필수 여부를 정한다).

## 검증

단위 테스트(필드·지우기·추천 칩의 유무와 이름, 클릭, 별표 읽힘, 크기 클래스)와 Storybook 렌더로 `Default`·`Selected`·`WithSuggestions`의 치수와 스타일을 Figma 값과 대조했다: 카드 376×46과 376×104, 테두리 1px `#EAEAEA`, 반경 10px, 핀 16px(15, 15), 오른쪽 아이콘 20px(x 341), 제목 14/21 600 자간 -0.5 `#25282D`, 별표 `#454EDF`, 칩 높이 36px·간격 6px·`#F5F5F5` 배경과 `#535A61` 글자. 글자 픽셀은 Pretendard가 없어 비교하지 않았다. 스크린 리더, 실기기 터치, 키보드 포커스 윤곽선의 실제 모양, 강제 색상 모드는 확인하지 않았다.

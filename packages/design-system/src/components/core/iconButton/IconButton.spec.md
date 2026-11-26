# 컴포넌트: IconButton

## 메타데이터

- 소유 경계: design-system (`core`, 어드민도 캘린더를 써서 2026-11-25 #562에서 `web`에서 옮김. 공개 주소 `@app/design-system`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Icon Button`(node `1577:13532`). 변형은 `Variant=Subtle·Outline·Primary` × `state=Default·Pressed` 6개다. `Calendar`의 이전·다음 달 화살표가 이 컴포넌트(Subtle)를 쓴다. 배경 없는 `plain`은 화면 곳곳의 아이콘 버튼(헤더 뒤로 가기·닫기·더보기, 복사, 지우기, 화살표 등)을 하나로 모은 변형이다(Figma `8311:57033` 「헤더 아이콘 눌림 효과」, 2026-11-26 #583).

## 목적과 범위

### 제공하는 동작

- 아이콘 하나만 있는 40px 원형 버튼. 흰 바탕 `subtle`, 흰 바탕에 테두리가 있는 `outline`, 어두운 바탕에 흰 아이콘 `primary`.

### 제공하지 않는 동작

- 비활성(`disabled`)·로딩, 아이콘 크기 변형(Figma는 Large 24px만), 라벨이 있는 버튼은 Figma에 없어서 만들지 않았다. 비활성은 모양이 정의돼 있지 않아 `disabled`를 props 타입에서 막았다(정해지면 추가).
- 이미 있는 `CameraButton`(28px, 사진 변경용)과 `FloatingButton`(52px, 그림자)은 크기·모양이 달라 합치지 않았다.

## Public API

- Props: `aria-label`(필수), `children`(아이콘), `variant`(기본 `subtle`, `plain`은 배경 없음), `press`(`plain`의 눌림: 기본 `overlay`, 뒤로 가기는 `fade`), 그리고 native `<button>`의 속성(`type`은 기본 `button`, `onClick`·`disabled`·`className` 등).
- 이벤트: native `onClick`. Controlled / uncontrolled: 해당 없음.
- 아이콘: Figma는 `Line/Icon-L/*`(Large 24px)를 쓴다. `children`에 `LineChevronRightLargeIcon` 같은 아이콘을 넣고, 장식이라 래퍼(`aria-hidden`) 안에서 숨겨진다.
- 호출자 소유 책임: 접근성 이름(i18n), 동작.

## 상태와 동작

- 크기·모양: 40×40px, `rounded-full`. 아이콘은 `currentColor`라 변형별 글자색을 따른다.
- Subtle: 배경 `surface-primary`, 아이콘 `icon-primary`(`#121212`).
- Outline: Subtle에 1px `border-tertiary`(`#EAEAEA`) 테두리. 테두리는 40px 안에 포함된다.
- Primary: 배경 `surface-inversed`(`#25282D`), 아이콘 `icon-inversed`(흰색).
- `plain`: 배경·크기가 없어 아이콘 크기를 따른다. 색(`text-icon-*`)과 누르는 범위(`before:-inset-*`, 24px 아이콘이면 `before:-inset-2`로 40px)는 쓰는 곳이 `className`으로 정한다. 누르는 동안 아이콘이 가운데 기준 0.917(24px 기준 2px, `docs/architecture/motion.md`)로 줄고(150ms, `cubic-bezier(0, 0, 0.15, 1)`), `overlay`는 아이콘 뒤에 `overlay-hover` 배경 36×36·모서리 8(`::after`, 레이아웃 영향 없음)을, `fade`는 배경 없이 아이콘 불투명도 60%를 쓴다(`press-icon-overlay`·`press-icon-fade`, `styles/utilities.css`). 누른 채 스크롤·비활성이면 눌림이 없고, 동작 줄이기면 줄지 않고 배경·흐려짐만 바로 바뀐다. 비활성은 40%로 흐린다.
- Pressed(`:active`, 배경 있는 세 변형): 버튼 안쪽 전체(아이콘 포함)에 `overlay-hover`(검정 10%)를 얹어 어둡게 한다. 75ms ease-out 전환(동작 줄이기에서는 끔). Outline의 테두리는 눌러도 그대로이고 Primary는 `#212428`이 된다.
- 포커스: 버튼 바깥 2px `border-brand` 윤곽선.

## 접근성

- Semantic element: native `<button type="button">`.
- Accessible name·label: 아이콘만 있어서 `aria-label`이 필수다(타입으로 강제). 아이콘은 `aria-hidden`.
- Keyboard·focus: Tab·Enter·Space로 누른다. 포커스 윤곽선은 `border-brand`다.
- 터치 영역: 보이는 크기가 40×40px라 `docs/architecture/design-system-icons.md`의 Medium·Large 터치 영역(40px)과 같다.
- 색 대비(토큰 hex로 계산): Subtle·Outline 아이콘 `#121212` on `#FFFFFF` 18.7:1, Primary 아이콘 `#FFFFFF` on `#25282D` 14.8:1로 통과한다. Outline 테두리 `#EAEAEA` on `#FFFFFF`는 약 1.2:1로 비텍스트 대비 3:1에 못 미치지만 버튼 모양은 아이콘으로도 전달되고 Figma 값이다(확인할 항목).

## Styling과 의존성

- Token: `bg-surface-primary`·`bg-surface-inversed`, `text-icon-primary`·`text-icon-inversed`, `border-border-tertiary`, `bg-overlay-hover`. 선언은 `tv`.
- 허용되는 dependency 추가 없음.
- Figma 이름 대응: `Variant=Subtle·Outline·Primary`→`variant`, `state=Pressed`→`:active`.
- Storybook state matrix: `Subtle`, `Outline`, `Primary`, `Variants`.

## 확인할 항목

- Outline 테두리 대비(위 접근성 항목). Subtle은 흰 배경 위에서 경계가 아예 없어 같은 기준으로 보면 Outline만의 문제는 아니며, 어떻게 할지는 디자이너 확인이 필요하다.
- Figma Pressed는 오버레이가 배경에만 깔린 것처럼 보이지만 Primary Pressed의 아이콘 SVG에 검정 요소가 겹쳐 있어 아이콘까지 10%로 덮는 것으로 읽었다. 구현도 아이콘 위까지 덮는다.
- 비활성 모양이 정해지면 추가해야 한다.

## 검증

단위 테스트(변형별 클래스와 테두리 유무, 이름, 클릭, 아이콘 숨김, 눌림 오버레이 클래스(공통 바탕 `press-overlay`와 `z-10`), `type`)와 Storybook 렌더로 세 변형의 Default·Pressed를 Figma 내보내기와 같은 조건에서 비교했다. 40×40 크기, Default 배경 Subtle·Outline `#FFFFFF`·Primary `#25282D`, Pressed 배경 Subtle·Outline `#E5E5E5`·Primary `#212428`, Outline 테두리 `#EAEAEA`(눌러도 그대로), 아이콘 선 `#121212`·흰색이 Figma 값과 같다. 스크린 리더, 실기기 터치, 키보드 포커스 윤곽선의 실제 모양, 강제 색상 모드는 확인하지 않았다.

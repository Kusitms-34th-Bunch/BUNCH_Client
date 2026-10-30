# 컴포넌트: SelectionIndicator, PhotoThumbnail

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다. `SelectionIndicator`(`web/selectionIndicator`)와 `PhotoThumbnail`(`web/photoThumbnail`)이 한 쌍이다.
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Selection Indicator`(node `247:623`)와 `Photo`(node `1474:8243`). 이슈 #97.

## 목적과 범위

### 제공하는 동작

- `SelectionIndicator`: 20px 원. 선택 전은 흰색 60% 채움 + 흰 1px 테두리, 선택 후는 흰 원 안에 선택 순서 숫자(14/21 SemiBold, 자간 -0.5, 검정).
- `PhotoThumbnail`: 123px 정사각형 사진(`object-cover`). 선택 모드가 켜지면 오른쪽 위(안쪽 여백 8px)에 인디케이터를 두고, 선택된 사진은 `overlay-pressed`(검정 20%) 오버레이를 덮는다.

### 제공하지 않는 동작

- 선택 목록·순서 계산, 최대 선택 개수, 선택 모드 진입·종료는 화면(feature)이 맡는다. 컴포넌트는 `selected`와 `selectionOrder`를 받아 그리기만 한다.
- 선택 모드가 꺼진 사진을 눌러 크게 보는 동작은 호출하는 쪽이 감싸서 정한다(Figma에 눌림 모양 없음).
- 불러오는 중·실패 상태는 Figma에 없어 만들지 않는다.

## Public API

- `SelectionIndicator`: `selected`(기본 false), `order`, 그리고 `span` 속성. 기본 `aria-hidden`.
- `PhotoThumbnail`: `src`·`alt`(필수), `selectionMode`(기본 false), `selected`(기본 false), `selectionOrder`, 그리고 HTML 속성(`onClick` 등).
- Figma 변형: Selected=False·SelectionMode=False(기본) / Selected=False·SelectionMode=True(`selectionMode`) / Selected=True·SelectionMode=True(`selectionMode selected`). SelectionMode=False에서 Selected=True인 변형은 Figma에 없고, 코드에서도 `selected`를 무시한다.
- 호출자 소유 책임: 사진 주소, 사진 설명(`alt`), 선택 상태와 순서.

## 상태와 동작

| Figma 변형                          | 코드                                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| Selected=False, SelectionMode=False | `<span>` 안의 사진만. 인디케이터 없음                              |
| Selected=False, SelectionMode=True  | `<button aria-pressed="false">` + 반투명 인디케이터                |
| Selected=True, SelectionMode=True   | `<button aria-pressed="true">` + 어두운 오버레이 + 순서 인디케이터 |

## 접근성

- 선택 모드의 사진은 `<button type="button" aria-pressed>`이고 이름은 `alt`에서 오며, 선택되고 순서가 있으면 이름 뒤에 화면 밖 글자 "N번째 선택"이 붙는다(`aria-pressed`와 정보가 겹치지만 순서는 이 글자로만 전달된다). 인디케이터는 장식(`aria-hidden`)이다. `aria-pressed`는 `selected`로 고정한다.
- 선택 모드가 꺼진 사진은 `<span>`이라 포커스·키보드 경로가 없다. `onClick`을 직접 주면 키보드로 쓸 수 없는 클릭 대상이 되므로, 눌러서 여는 동작은 호출하는 쪽이 `<button>`·`<a>`로 감싸서 만든다.
- "N번째 선택" 문구는 한국어로 고정이다(다국어 도입 시 처리).
- 선택 모드가 아닌 사진은 일반 이미지(`alt`)이고 포커스를 받지 않는다.
- 포커스 링은 `focus-visible` 안쪽 outline(`-outline-offset-2`)이라 `overflow-hidden`에 잘리지 않는다.
- 선택 순서를 숫자 외에 색으로만 전달하지 않는다(숫자 + 오버레이 + `aria-pressed`).
- 선택 전 인디케이터(흰 60% 원)는 밝은 사진 위에서 보이기 어려울 수 있다. Figma 값이라 그대로 두고 디자이너 확인 항목으로 둔다. 선택 여부는 `aria-pressed`로도 전달된다.

## Styling과 의존성

- Token: `typography-body-3-semi-bold`(14/21 · -0.5 · 600, 토큰 이름 오타는 repo 그대로), `bg-overlay-pressed`, `top-s4`·`right-s4`(8px), `border-white`·`bg-white`·`text-black`(Figma의 흰색·검정). 폭 123px은 토큰에 없어 기본 scale(`w-30.75`)로 적용했다.
- dependency 추가 없음.
- Storybook: `Web/SelectionIndicator`(NotSelected, Selected, Matrix), `Web/PhotoThumbnail`(Default, SelectionMode, Selected, Matrix, Interactive: 눌러서 고르면 순서가 붙고 해제하면 뒤 번호가 당겨짐).

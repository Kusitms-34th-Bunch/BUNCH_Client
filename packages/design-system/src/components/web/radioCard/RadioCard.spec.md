# 컴포넌트: RadioCard

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)의 선택 카드이고 `core`의 `Radio`를 조합한다.
- Status: 구현됨(Chrome 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `Radio Card`(node `1379:22093`). Figma의 `Selected=Default / Hover / Pressed`를 아래 "상태와 동작"으로 옮겼다.
- 이슈: #77(`Radio`와 함께)

## 목적과 범위

### 제공하는 동작

- 라디오 + 글자 한 줄의 선택 카드. 여러 카드 중 하나를 고른다. 카드 어디를 눌러도 선택된다.
- 글자는 `children`으로 받는다(Figma 예: 「비공개」).

### 제공하지 않는 동작

- 그룹 묶음. 같은 `name`을 주고 호출하는 쪽이 `<fieldset>`·`<legend>`로 묶는다.
- 제목·설명·아이콘이 있는 큰 카드. 그것은 `VisibilityOption`이다.
- 선택 값 관리와 문구(i18n).

## Public API

- Props: `children`(필수, 카드 글자이자 접근성 이름), 그리고 native `<input type="radio">`의 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange` 등. `type`·`disabled`는 제외). `className`은 카드(`<label>`)에 적용한다.
- 호출자 소유 책임: 글자, `name`·`value`, 그룹, 선택 값.

## 상태와 동작

- Figma의 속성 이름은 `Selected`지만 값이 `Default`·`Hover`·`Pressed`다. 화면을 보면 `Pressed`가 선택된 카드(브랜드색 배경·테두리, 선택된 라디오)이고 `Hover`는 어두워진 카드라서 아래처럼 옮겼다.
  - Default(선택 전): 배경 `surface-secondary`.
  - Hover(선택 전): 카드 전체에 `overlay-hover`(10%)를 얹는다. 마우스처럼 hover가 되는 기기에서만 적용한다.
  - 선택됨(Figma `Pressed`): 배경 `surface-brand-subtle-1` + 안쪽 1px `surface-brand-subtle-2` 테두리, 라디오는 Selected.
- 크기: 높이 54px, 왼쪽 안쪽 여백 16px(Figma 값, 선택 전후 동일), 오른쪽 안쪽 여백 16px(Figma 미정의, 제안), 라디오와 글자 사이 6px, radius 8px. Figma의 폭 167px은 고정값으로 보이지 않아 부모 폭을 채운다(`w-full`).
- 글자: 14px Regular, `text-tertiary`.
- 긴 글자: 줄바꿈하지 않고 말줄임(한 줄 카드). `LongLabel` story로 확인한다.
- 누르는 동안(`:active`): 안의 `Radio`가 Pressed(회색 링·점)로 보인다. 카드 글자 쪽을 눌러도 같다(`core/radio`의 `label:active` 조건, Chromium 확인).

## 접근성

- Semantic element: `<label>` 안에 native 라디오(`Radio`)와 글자. 글자가 라디오의 접근성 이름이다.
- Keyboard·focus: Tab으로 그룹에 들어가고 방향키로 이동, Space로 선택. 포커스 윤곽선은 카드 바깥 2px `border-brand`다.
- 색만으로 전달하지 않는다: 선택은 색뿐 아니라 라디오 점의 유무로도 구분된다.
- 그룹은 호출하는 쪽의 `<fieldset>`·`<legend>`로 질문을 전달한다.
- 접근성 이름은 글자(`children`)다. `aria-label`을 넘기면 글자 이름을 덮으므로 쓰지 않는다.
- 긴 글자: 한 줄 말줄임이라 잘린 글자를 시각으로 볼 방법이 없다. 짧은 문구만 쓰고, 필요하면 호출하는 쪽이 `title`을 준다.
- 색 대비 (디자이너 확인): 선택 전 라디오 테두리 `#EAEAEA`는 카드 배경(`#F7F7F8`) 위에서 대비가 매우 낮다(Figma 값).
- 터치: 카드(`<label>`) 전체가 눌리는 영역이고 더블탭 지연을 막으려고 `touch-manipulation`을 적용했다.

## Styling과 의존성

| Figma              | 값                        | 사용한 토큰·utility                                        |
| ------------------ | ------------------------- | ---------------------------------------------------------- |
| 높이·반경          | 54px, 8px                 | `h-13.5 rounded-r4`                                        |
| 안쪽 여백·간격     | 왼쪽 16px, 6px            | `pl-padding-p8 gap-s3`                                     |
| 오른쪽 안쪽 여백   | (Figma 미정의, 제안 16px) | `pr-padding-p8`                                            |
| 배경               | `#F5F5F5`                 | `bg-surface-secondary`                                     |
| 선택됨 배경·테두리 | `#F1F2FF`, 1px `#A7ADFF`  | `bg-surface-brand-subtle-1`, `ring-surface-brand-subtle-2` |
| Hover              | 검정 10% 겹침             | `overlay-hover`                                            |
| 글자               | 14/21 Regular, `#535A61`  | `typography-body-3-regular text-text-tertiary`             |

- 조합: `Radio`(core)를 그대로 쓴다. dependency 추가 없음.
- 타이포 이름: Figma `Body-3-Regular`(14/21)·`Body-4-Regular`(13/18)와 이름·값이 같은 `body-3-regular`·`body-4-regular`를 쓴다(2026-10-31 토큰 이름을 Figma와 맞춤).
- Storybook state matrix: 선택 전·선택됨·긴 글자(`LongLabel`), 그리고 `fieldset` 그룹 예. Hover와 눌림은 포인터 상태라 정지 화면으로 만들 수 없어 story로 두지 않았다.

## 확인할 항목

- Figma 상태 이름 (확인): `Selected` 속성의 `Pressed`를 선택된 카드로 해석했다. 실제로 누르는 순간의 별도 모양이 있다면 알려 달라.
- Hover 범위 (제안): Figma의 Hover 카드는 안의 라디오가 Disabled 모양(흰 원 + 10%)으로 그려져 있다. 구현은 카드 전체에 10%를 얹어 원이 같이 어두워지는데, 라디오 테두리도 같이 어두워져(측정: Figma `#EAEAEA`, 구현 `#D2D2D2`) 1px 선이 조금 진해 보이고 글자도 아주 조금 어두워진다.
- 선택됨의 hover (제안): Figma에 없어 선택된 카드에는 hover 효과를 주지 않는다.
- Disabled (제외): Figma에 카드의 Disabled 상태가 없어 지원하지 않는다. `disabled`는 Props에서 제외했다. 필요해지면 디자인을 받은 뒤 추가한다.
- 배경 토큰 값 (확정): 토큰 `surface-secondary`(`gray-100`)가 `#f7f7f8`이었고 Figma 변수는 `#f5f5f5`였다(렌더 픽셀로 확인). `surface-secondary`가 가리키는 기본 회색 `gray-100`을 Figma 값 `#f5f5f5`로 맞췄다(2026-10-26 디자이너 확인).
- 선택됨 카드의 안쪽 여백 (확정): Figma의 왼쪽 안쪽 여백은 16px이다. 내보낸 이미지를 픽셀로 재면 선택된 카드의 1px 테두리가 레이아웃을 밀어 라디오가 17px 위치로 보이지만, 이는 Figma 렌더의 부작용으로 보고 여백 값(16px)을 따랐다. 테두리는 안쪽 링으로 그려 선택 전후 위치가 같다.
- 오른쪽 안쪽 여백 (제안): Figma는 왼쪽 여백만 정의한다. 긴 글자가 카드 오른쪽 끝에 붙지 않도록 같은 16px을 줬다. 짧은 글자에는 영향이 없다.
- 폭 (제안): 167px 고정으로 보지 않고 부모 폭을 채운다. 실제 배치(1열·2열)는 화면 구현 때 정한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, `vitest run src/components/core/radio src/components/web/radioCard`(13개 통과), `gen:index:check`, Prettier 통과.

Storybook을 빌드해 Chrome에서 Figma 4배 내보내기(`Radio Card` 프레임, 배경 `#3A3A3A`)와 같은 조건으로 비교했다(Hover는 마우스를 올린 상태). 카드 배경·선택됨 배경(`#F1F2FF`)·선택됨 테두리(`#A7ADFF`)·라디오 안쪽 색이 일치하고, 차이는 위 "확인할 항목"의 Hover 테두리뿐이다(배경 토큰 값은 `gray-100`을 `#f5f5f5`로 맞춰 해소했고, 선택됨 1px 이동은 Figma 여백 값 16px을 따라 적용하지 않았다). Tab으로 카드에 포커스를 주면 윤곽선이 카드 바깥에만 그려지고 라디오 주변에는 그려지지 않는 것을 렌더 픽셀로 확인했다. 글자 렌더 비교, 누르는 순간의 카드, 강제 색상 모드, 스크린 리더는 확인하지 않았다.

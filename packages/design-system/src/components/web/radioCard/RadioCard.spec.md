# 컴포넌트: RadioCard

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)의 선택 카드이고 `core`의 `Radio`를 조합한다.
- Status: 구현됨(Chrome 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `Radio Card`(node `1379:22093`). Figma 속성은 `Selected=False / True`다.
- 이슈: #77(`Radio`와 함께)

## 목적과 범위

### 제공하는 동작

- 라디오 + 제목·설명의 선택 카드. 여러 카드 중 하나를 고른다. 카드 어디를 눌러도 선택된다.
- 글자는 `title`·`description`으로 받는다(Figma 예: 「전체 공개」·「번치의 모든 사용자가 볼 수 있어요」).

### 제공하지 않는 동작

- 그룹 묶음. 같은 `name`을 주고 호출하는 쪽이 `<fieldset>`·`<legend>`로 묶는다.
- 아이콘이 있는 큰 카드는 만들지 않았다(공개 범위 카드 `VisibilityOption`은 #290에서 삭제).
- 선택 값 관리와 문구(i18n).

## Public API

- Props: `title`(필수, 접근성 이름), `description`(필수, 접근성 설명), 그리고 native `<input type="radio">`의 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange` 등. `type`·`disabled`는 제외). `className`은 카드(`<label>`)에 적용한다.
- 호출자 소유 책임: 글자, `name`·`value`, 그룹, 선택 값.

## 상태와 동작

- 선택 전(`Selected=False`): 배경 `surface-secondary`.
- 선택됨(`Selected=True`): 배경 `surface-brand-subtle-1` + 안쪽 1px `border-brand-subtle` 테두리, 라디오는 Selected.
- Hover(선택 전): 카드 전체에 `overlay-hover`(10%)를 얹는다. 지금 Figma에는 없고 이전 시안 값을 유지했다. 마우스처럼 hover가 되는 기기에서만 적용한다.
- 크기: 두 글자 줄이 한 줄씩이면 높이 78px, 안쪽 여백 위아래 18px·좌우 16px, 라디오와 글자 사이 14px, 제목과 설명 사이 4px, radius 8px. 부모 폭을 채운다(`w-full`).
- 글자: 제목 15/22 Medium, 설명 12/16 Regular.
- 긴 글자: 줄바꿈하고 카드 높이가 늘어난다. `LongLabel` story로 확인한다.
- 누르는 동안(`:active`): 안의 `Radio`가 Pressed(회색 링·점)로 보인다. 카드 글자 쪽을 눌러도 같다(`core/radio`의 `label:active` 조건, Chromium 확인).

## 접근성

- Semantic element: `<label>` 안에 native 라디오(`Radio`)와 글자. 제목이 접근성 이름(`aria-labelledby`), 설명이 접근성 설명(`aria-describedby`)이다.
- Keyboard·focus: Tab으로 그룹에 들어가고 방향키로 이동, Space로 선택. 포커스 윤곽선은 카드 바깥 2px `border-brand`다.
- 색만으로 전달하지 않는다: 선택은 색뿐 아니라 라디오 점의 유무로도 구분된다.
- 그룹은 호출하는 쪽의 `<fieldset>`·`<legend>`로 질문을 전달한다.
- 긴 글자는 줄바꿈해 잘리지 않는다.
- 색 대비 (디자이너 확인): 선택 전 라디오 테두리 `#EAEAEA`는 카드 배경(`#F7F7F8`) 위에서 대비가 매우 낮다(Figma 값).
- 터치: 카드(`<label>`) 전체가 눌리는 영역이고 더블탭 지연을 막으려고 `touch-manipulation`을 적용했다.

## Styling과 의존성

| Figma              | 값                       | 사용한 토큰·utility                                     |
| ------------------ | ------------------------ | ------------------------------------------------------- |
| 반경               | 8px                      | `rounded-r4`                                            |
| 안쪽 여백          | 위아래 18px, 좌우 16px   | `py-s9 px-padding-p8`                                   |
| 라디오·글자 간격   | 14px, 제목·설명 4px      | `gap-s7`, `gap-s2`                                      |
| 배경               | `#F5F5F5`                | `bg-surface-secondary`                                  |
| 선택됨 배경·테두리 | `#F1F2FF`, 1px `#A7ADFF` | `bg-surface-brand-subtle-1`, `ring-border-brand-subtle` |
| Hover              | 검정 10% 겹침            | `overlay-hover`                                         |
| 제목               | 15/22 Medium, `#535A61`  | `typography-body-2-medium text-text-tertiary`           |
| 설명               | 12/16 Regular, `#969AA0` | `typography-caption-1-regular text-text-quaternary`     |

- 조합: `Radio`(core)를 그대로 쓴다. dependency 추가 없음.
- Storybook state matrix: 선택 전·선택됨·긴 글자(`LongLabel`), 그리고 `fieldset` 그룹 예. Hover와 눌림은 포인터 상태라 정지 화면으로 만들 수 없어 story로 두지 않았다.

## 확인할 항목

- 설명 글자 대비 (디자이너 확인): Figma 변수 `text-quaternary`(`#969AA0`)는 카드 배경에서 약 2.6:1(선택됨 약 2.5:1)로 WCAG AA 4.5:1에 못 미친다. 공개 범위의 뜻을 알리는 글자라 진한 토큰이 필요한지 확인한다.
- Hover 범위 (제안): Figma의 Hover 카드는 안의 라디오가 Disabled 모양(흰 원 + 10%)으로 그려져 있다. 구현은 카드 전체에 10%를 얹어 원이 같이 어두워지는데, 라디오 테두리도 같이 어두워져(측정: Figma `#EAEAEA`, 구현 `#D2D2D2`) 1px 선이 조금 진해 보이고 글자도 아주 조금 어두워진다.
- 선택됨의 hover (제안): Figma에 없어 선택된 카드에는 hover 효과를 주지 않는다.
- Disabled (제외): Figma에 카드의 Disabled 상태가 없어 지원하지 않는다. `disabled`는 Props에서 제외했다. 필요해지면 디자인을 받은 뒤 추가한다.
- 배경 토큰 값 (확정): 토큰 `surface-secondary`(`gray-100`)가 `#f7f7f8`이었고 Figma 변수는 `#f5f5f5`였다(렌더 픽셀로 확인). `surface-secondary`가 가리키는 기본 회색 `gray-100`을 Figma 값 `#f5f5f5`로 맞췄다(2026-10-26 디자이너 확인).
- 선택됨 테두리: 안쪽 링으로 그려 선택 전후 글자 위치가 같다.
- `DescriptionRadioCard`와 역할이 비슷하다(radius·여백·제목 굵기·색이 다름). 합칠 수 있는지 디자이너 확인이 필요하다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

Storybook(Chrome) `Group` 측정: 카드 342×78, radius 8, 여백 18/16, 라디오 20, 라디오·글자 14, 제목·설명 4, 카드 사이 4, 글자 15/22 500과 12/16 400, 선택됨 `#F1F2FF`와 1px `#A7ADFF`, 선택 전 `#F5F5F5`, 제목 `#535A61`, 설명 `#969AA0`로 Figma 값과 같다.

이전 시안 기준 검증: Storybook을 빌드해 Chrome에서 Figma 4배 내보내기(`Radio Card` 프레임, 배경 `#3A3A3A`)와 같은 조건으로 비교했다(Hover는 마우스를 올린 상태). 카드 배경·선택됨 배경(`#F1F2FF`)·선택됨 테두리(`#A7ADFF`)·라디오 안쪽 색이 일치하고, 차이는 위 "확인할 항목"의 Hover 테두리뿐이다(배경 토큰 값은 `gray-100`을 `#f5f5f5`로 맞춰 해소했고, 선택됨 1px 이동은 Figma 여백 값 16px을 따라 적용하지 않았다). Tab으로 카드에 포커스를 주면 윤곽선이 카드 바깥에만 그려지고 라디오 주변에는 그려지지 않는 것을 렌더 픽셀로 확인했다. 글자 렌더 비교, 누르는 순간의 카드, 강제 색상 모드, 스크린 리더는 확인하지 않았다.

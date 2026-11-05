# 컴포넌트: ChipButton

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `ChipButton`(node `1303:14763`). Figma 변형 `Size`(S·M·L) × `Variant`(Solid·Outline·Avatar) × `State`(Default·Hover·Selected). 이슈 #98.

## 목적과 범위

### 제공하는 동작

- 필터·선택용 알약 모양 버튼. 글자와 선택적 개수(`(3)`), 왼쪽 × 아이콘 또는 왼쪽 24px 원 이미지(avatar), 오른쪽 아래 화살표 아이콘을 둘 수 있다.
- 크기: S 높이 32 · M 36 · L 38. 좌우 여백은 S·M 10, L 12(avatar는 아래 표).
- 선택됨(Selected): 어두운 배경(`surface-inversed`) + 흰 글자. Outline은 테두리도 같은 어두운 색.
- 호버: 아래 "상태와 동작".

### 제공하지 않는 동작

- 단일·다중 선택 규칙, 선택 목록, 드롭다운 열기·닫기는 화면(feature)이 맡는다.
- 비활성·로딩·눌림 전용 모양은 Figma에 없어 만들지 않는다(`disabled`를 받지 않음).

## Public API

- `children`(필수 글자), `size`(`S` 기본·`M`·`L`), `variant`(`solid` 기본·`outline`·`avatar`), `selected`(생략 가능, 값을 주면 토글 칩), `count`, `leftIcon`, `rightIcon`, `avatarSrc`, 그리고 native `<button>` 속성(`disabled`·`type` 제외).
- Figma `leftIcon`·`rightIcon`의 기본값은 켜짐이지만, 아이콘 없는 칩이 흔해서 코드 기본값은 꺼짐이다. Figma 변형은 모두 표현할 수 있다.
- avatar에서는 왼쪽에 원 이미지를 그리고 `leftIcon`은 쓰지 않는다. `avatarSrc`가 없으면 배경색 원만 그린다.
- 호출자 소유 책임: 글자·개수, 선택 상태, 이미지 주소, 선택 규칙.

## 상태와 동작

| Variant | Default                                            | Hover(Figma 실측)                 | Selected                                         |
| ------- | -------------------------------------------------- | --------------------------------- | ------------------------------------------------ |
| Solid   | `surface-secondary`(#f5f5f5), 글자 `text-tertiary` | #dcdcdc(검정 10%를 #f5f5f5 위에)  | `surface-inversed`(#25282d), 글자 흰색           |
| Outline | `surface-primary` + 1px `border-tertiary`          | 흰색 그대로(Figma에서 변화 없음)  | `surface-inversed` + 1px 같은 색 테두리, 흰 글자 |
| Avatar  | `surface-secondary`                                | #e5e5e5(검정 10%를 **흰색** 위에) | `surface-inversed`, 흰 글자                      |

- 호버 오버레이는 `overlay-hover`(검정 10%)이고, 선택된 칩에서는 호버 변화가 없다(Figma에 없음).
- 모션(Figma 공통 모션의 칩버튼 모션, 2026-10-30): 누르는 동안(`active`)이 Hover 모양이고(마우스 호버와 같은 모양) 손을 떼면 Selected로 바뀌며, 둘 다 Dissolve·Ease out·300ms다. 배경·글자·테두리 색은 `transition-colors`로, 오버레이는 투명도로 300ms에 섞인다. 이전에는 호버 75ms였다. Outline은 Figma Hover가 변하지 않아 누르는 동안에도 변화가 없고, 동작 줄이기에서는 전환을 끈다. "Ease out"은 Tailwind `ease-out`(`cubic-bezier(0, 0, 0.2, 1)`)이라 CSS 표준 곡선과 다르다(`docs/architecture/motion.md`).
- avatar 좌우 여백: S 4/8 · M 6/8 · L 8/10.
- 아이콘: S·M은 16px(Small), L은 20px(Medium). 개수 글자는 L에서만 16/24(Figma 값).

## 접근성

- 하나의 `<button type="button">`이고 접근성 이름은 글자와 개수(예: "서울특별시 (3)")다. 아이콘과 avatar 원은 `aria-hidden`이다.
- 선택됨은 `selected`를 값(`true`·`false`)으로 줄 때만 `aria-pressed`로 전달한다. 필터·토글 칩은 `selected={boolean}`을 명시하고, 드롭다운을 여는 칩은 `selected`를 생략한 채 `aria-haspopup`·`aria-expanded`를 전달한다(생략하면 `aria-pressed`가 없어 토글 버튼으로 읽히지 않는다).
- 포커스 링은 `focus-visible`의 2px `border-brand` outline(offset 2)이다.
- 터치 영역: 높이가 32~38px이라 `after` 요소로 위아래만 44px 이상으로 넓혔다(S 6px·M 4px·L 3px씩). 가로는 옆 칩과 겹치지 않게 그대로라 글자가 한두 자인 칩은 가로가 44px보다 좁을 수 있다. 호출하는 쪽은 줄바꿈되는 칩 목록의 줄 간격을 12px 이상(S 기준)으로 두고, `overflow-x-auto` 스크롤 컨테이너에는 위아래 안쪽 여백을 8px 이상 주어야 터치 영역과 포커스 링이 잘리거나 겹치지 않는다.
- 호버가 없는 터치 환경에서도 선택 여부가 배경색과 `aria-pressed`(값을 준 경우)로 전달된다.
- avatar 칩의 이미지는 장식(`alt=""`)이다. 이미지 안의 정보를 전달해야 하면 글자에 포함한다.
- 개수는 화면에 보이는 `(3)` 그대로 읽히며 이름은 "서울특별시 (3)" 형태다. 브라우저에 따라 사이 공백 없이 계산될 수 있고 숫자가 무엇의 개수인지는 맥락 없이 전달되지 않으므로, 필요하면 호출하는 쪽이 `aria-label`("서울특별시, 3개 선택됨")로 덮어쓴다. 왼쪽 × 아이콘은 장식이라 "눌러서 제거"를 이름에 담지 않으니, 그런 용도면 `aria-label`로 동작을 설명한다.
- 글자는 `whitespace-nowrap`·`shrink-0`이라 줄어들거나 줄바꿈하지 않고 말줄임도 없다. 좁은 화면의 줄바꿈(`flex-wrap`)·가로 스크롤은 컨테이너가 맡고, 잘린 이름을 보여야 하면 호출하는 쪽이 처리한다.

## Styling과 의존성

- Token: `typography-body-3-regular`(14/21), `typography-body-1-regular`(L 개수 16/24, -0.25), `surface-secondary`·`surface-primary`·`surface-inversed`, `text-tertiary`·`text-inversed`, `border-tertiary`, `bg-overlay-hover`, `px-s5`·`px-s6`·`gap-s2`, `rounded-full`, 높이 38px은 기본 scale `h-9.5`.
- Figma `border-strong`(#25282d) token은 repo에 없고 `surface-inversed`와 같은 값이라 후자를 썼다.
- avatar 원은 `ProfileImage`(div)를 쓰면 `<button>` 안에 `<div>`가 들어가 유효하지 않아, 같은 모양의 `<span>`을 직접 그렸다.
- 아이콘: `LineCloseSmall/MediumIcon`, `LineChevronDownSmall/MediumIcon`(기존). dependency 추가 없음.
- Storybook: `Web/ChipButton`(Default, Selected, Outline, Avatar, WithCount, Matrix, Interactive).

## 디자이너 확인 항목

- Outline의 Hover가 Default와 같은 흰색이다(Figma 레이어가 흰색이 검정 위에 놓여 변화가 없음). 의도인지, 다른 변형처럼 10% 어둡게 해야 하는지 확인이 필요하다.
- Avatar의 Hover가 Default(#f5f5f5)가 아니라 흰색 기준(#e5e5e5)이라, 호버하면 오히려 기본보다 어두워지는 정도가 Solid(#dcdcdc)와 다르다. 의도 확인이 필요하다.
- L 크기에서만 개수 글자가 16/24(-0.25)라 라벨(14/21)과 크기가 다르다. 의도 확인이 필요하다.
- Solid 기본(#f5f5f5 배경, #535a61 글자)의 대비는 약 7:1이라 문제 없지만, Outline·Avatar 테두리(#eaeaea)는 흰 배경 대비 1.2:1이라 경계 인식은 배경색 차에 기대지 않는다.

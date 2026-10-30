# 컴포넌트: ColorBadge

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Badge`(node `1648:8846`). Figma 이름은 `Badge`지만 기존 `core/badge`의 `Badge`(node `637:3630`)와 값이 달라 별도 컴포넌트로 두고 `ColorBadge`로 이름을 붙였다.

## 목적과 범위

### 제공하는 동작

- 짧은 라벨을 칩 모양으로 보여 주는 표시용 컴포넌트.
- size 2개(`lg`, `md`) × color 5개(`gray`, `brand`, `pink`, `green`, `orange`) × variant 2개(`weak`, `fill`) = 20종.

### 제공하지 않는 동작

- 클릭 등 상호작용, 아이콘, 숫자 카운트 전용 모양은 Figma에 없어서 만들지 않았다.
- 기존 `Badge`의 `sm` 크기와 `yellow` 칩 색은 이 디자인에 없어서 포함하지 않았다.

## Public API

- Props: `variant`(기본 `weak`), `color`(기본 `gray`), `size`(기본 `lg`), `children`, 그리고 native `<span>`의 모든 속성(`className`, `ref`, `aria-*` 등). 기본값은 Figma 기본값(`L`, `Gray`, `Weak`)이다.
- 이벤트: 없음. Controlled / uncontrolled: 해당 없음.
- 글자 크기: `typography-*` 토큰이 정하며 `text-sm` 같은 크기 클래스로는 바꿀 수 없다.
- 호출자 소유 책임: 라벨 문구(i18n), 배치.

## 상태와 동작

- Weak: 배경이 옅고 글자가 진하다. gray는 `surface-secondary`/`text-tertiary`, brand는 `surface-brand-subtle-1`/`text-brand`, pink·green·orange는 `chip-*-bg`/`chip-*-fg`.
- Fill: gray는 `surface-inversed-lighter` + `text-inversed`, brand는 `surface-brand` + `text-inversed`, pink·green·orange는 Weak의 배경과 글자색을 맞바꾼다(`chip-*-fg` 배경 + `chip-*-bg` 글자).
- 크기: `lg`는 패딩 8×4, 14/21 Regular(`typography-body-3-regular`), 반경 `r4`(8px). `md`는 패딩 8×4, 12/16 Regular(`typography-caption-1-regular`), 반경 `r3`(6px).
- 긴 텍스트: 줄바꿈하지 않고 `overflow-clip`으로 잘린다(`max-w-full`). 말줄임 표시는 없고 스크린 리더는 전체를 읽으므로 호출자는 짧은 문구만 넘긴다.

## 접근성

- Semantic element: `<span>`(역할 없는 표시용).
- Accessible name·label: 글자가 그대로 읽힌다.
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.
- 대비(토큰 hex로 계산, 렌더로 재지 않음): gray 6.41(Weak)·6.99(Fill), brand 5.54·6.16으로 AA(4.5:1)를 넘는다. pink 2.62, green 1.71, orange 2.10으로 일반 텍스트 AA에 크게 못 미친다(확인할 항목). 색은 디자인 값이라 코드에서 바꾸지 않았다. 의미를 색에만 의존하지 않고 글자로 전달하는 보조 라벨로 쓴다.
- `color`: native span의 deprecated `color` 속성과 이름이 같지만 ColorBadge의 색 축으로만 쓰이며 DOM에 전달되지 않는다.

## Styling과 의존성

- 색은 위 "상태와 동작"의 semantic token(surface·text·chip)을 쓴다. 반경은 `r3`·`r4`, 패딩은 `p4`·`p2`다. 선언은 `tv` + `compoundVariants`.
- 새 token: `chip-orange-bg`(`#fff6e6`), `chip-orange-fg`(`#ff9100`), `surface-inversed-lighter`(`#535a61`, gray-600)와 이를 받는 `orange-50`·`orange-500` primitive를 `tokens.json`에 추가했다. 기존 token 값은 바꾸지 않았다.
- 허용되는 dependency: `tailwind-variants`.
- Figma 이름 대응: `Weak/Fill`→`weak/fill`, `Gray/Brand/Pink/Green/Orange`→`color`, `L/M`→`lg/md`, `text`→`children`.
- Storybook state matrix: `Default`, `Matrix`(20종), `LongLabel`.

## 확인할 항목

- 기존 `Badge`와 값이 다르다(예: brand 색 `#777ff2` vs `#454edf`, 크기 `lg/md/sm` vs `L/M`). 기존 `Badge`도 이 값으로 맞출지 디자이너 확인이 필요하다.
- Tokens Studio(`design-token` 브랜치)에 위 새 token이 없으면 자동 PR이 덮어쓸 수 있다. orange primitive는 Figma가 노출하는 두 값(50·500)만 넣었다.
- pink·green·orange 글자 대비가 낮다(위 접근성 항목).

## 검증

Storybook을 빌드해 `Matrix`의 20종 모두 배경·글자색·반경·글자 크기/행간/굵기를 Figma 값(변수 hex)과 대조했고 전부 같다. 크기는 `lg` 40.2×29, `md` 36.75×24로 Figma 41×29, 37×24와 같다(Figma는 소수를 올림). 4배 픽셀 비교는 하지 않았다. 스크린 리더와 실기기는 확인하지 않았다.

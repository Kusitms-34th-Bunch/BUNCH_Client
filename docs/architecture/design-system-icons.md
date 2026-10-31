# Design System Icons

Figma의 Line 29종·Fill 8종을 Small(16)·Medium(20)·Large(24) 원본으로 제공한다. 크기별 SVG(총 111개)를 SVGR로 변환해 **고정 크기 export 111개**와 기존 `size`(`sm`·`md`·`lg`) 선택용 export 37개로 제공한다. 고정 크기가 기본이며 크기가 실행 중 바뀔 때만 `size` API를 사용한다. 크기마다 도형과 선 굵기가 다르게 그려져 있어서(small 1.2, medium·large 1.5) 단순 확대·축소로 대체하지 않는다. 이름 정규화와 접근성 계약은 `packages/design-system/src/icons/icons.spec.md`를 따른다.

## 왜 design-system인가

아이콘은 보통 여러 app이 같은 의미로 재사용하는 제품 비의존 asset이라 `docs/architecture/design-system-components.md`의 배치 기준과 같은 논리를 따른다.

- **design-system에 둔다**: 여러 app에서 같은 의미·모양으로 재사용하고, 제품 copy·route·API·logging에 의존하지 않는다.
- **app 내부에 둔다**: 한 app 또는 한 화면 전용이거나, 이름·노출 조건이 특정 도메인에 묶인다.

## 구조

```text
packages/design-system/src/icons/
  svg/            currentColor로 정규화할 원본 SVG(단색 아이콘)
  svg-preserve/   원본 색을 유지해야 하는 SVG(로고, 브랜드 마크)
  svg-graphic/    크기가 하나뿐인 컬러 그래픽 아이콘(graphic-<이름>.svg)
  generated/      생성된 TSX 컴포넌트 + barrel index.ts (직접 수정 금지)
```

## 명명

원본 파일명에서 `-small`·`-medium`·`-large`를 뗀 이름을 PascalCase로 변환하고, `Icon`/`Logo`/`Brand`/`Symbol`/`Wordmark`로 끝나지 않으면 `Icon`을 붙인다. 세 크기 파일이 모두 있어야 생성되고, 하나라도 없거나 파일명이 `<이름>-small|medium|large.svg` 형식이 아니면 생성이 실패한다.

```text
svg/line-chevron-down-{small,medium,large}.svg
  → generated/LineChevronDown{Small,Medium,Large}Icon.tsx (도형·접근성)
  → generated/LineChevronDownIcon.tsx (크기 선택 래퍼)
svg/fill-circle-check-{small,medium,large}.svg
  → generated/FillCircleCheck{Small,Medium,Large}Icon.tsx
  → generated/FillCircleCheckIcon.tsx
```

## 그래픽 아이콘

온보딩 카드처럼 색이 있고 크기가 고정된 아이콘(Globe·Lock 34px, Chat·Edit·People 40px, 완성된 역할 배지는 16·20px 두 종)은 Line/Fill의 세 크기 규칙에 맞지 않아 `svg-graphic/`에서 따로 만든다.

- 파일은 `graphic-<이름>.svg` 하나이고 width·height가 같은 양수이며 viewBox가 `0 0 <width> <height>`여야 한다. 다르면 생성이 실패한다.
- 원본 색을 유지하고(`currentColor`로 바꾸지 않는다) `size` prop이 없다. 컴포넌트는 `GraphicLockIcon`처럼 `Graphic<이름>Icon`이다. 크기가 둘 이상인 그래픽(역할 배지)은 Line/Fill과 같은 규약으로 `GraphicRoleOwnerSmallIcon`처럼 `Small`·`Medium`을 이름에 붙이며, 크기를 고르는 래퍼는 만들지 않는다.
- 접근성 계약은 고정 크기 아이콘과 같다(기본 장식, `aria-label`·`aria-labelledby`가 있으면 `role="img"`).
- Figma는 아이콘을 캔버스 크기 프레임 안에 레이어로 배치하므로, 레이어 SVG를 프레임 좌표대로 한 캔버스에 조립해 넣는다(래퍼 노드 export는 주변 캔버스가 섞인다).
- 색이 SVG에 고정돼 있어 밝은 배경을 전제로 한다. Chat·Edit의 안쪽 틈은 칠하지 않은 투명 구멍이라 배경색이 비친다. 어두운 배경이나 흰색이 아닌 카드 위에서의 모습은 확인하지 못했고, 필요해지면 디자이너와 별도 원본 여부를 정한다.
- 안전성 검증과 metadata 제거는 다른 SVG와 같다.

## SVG 입력 검증 (필수)

SVGR은 sanitizer가 아니다. 외부에서 받은 SVG(특히 Figma export, 디자이너 전달 파일)를 그대로 신뢰하지 않는다. 생성 스크립트는 변환 전에 아래를 차단한다.

- `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, SMIL 요소(`<animate*>`, `<set>`), 네임스페이스 접두어가 붙은 같은 태그
- `on*` 이벤트 속성(`onclick`, `onload` 등)
- `javascript:` URL
- 같은 문서 내부 `#id` fragment가 아닌 외부 `href`/`xlink:href`
- 외부 CSS 참조와 DTD·entity·XML stylesheet

이 검증은 정규식 기반 1차 차단이라 모든 우회를 막지 못한다. 새 SVG를 들일 때는 리뷰에서 원본도 직접 확인한다.

metadata는 변환 전에 제거한다. Line/Fill 세트는 모두 단색이며, white는 clipPath 내부에만 있어 `svg-preserve/`의 아이콘은 없다. 컬러 아이콘은 `svg-graphic/`의 그래픽 아이콘뿐이다.

이 검증 없이 아이콘 생성 스크립트를 만들지 않는다. `docs/workflows/security-review.md`의 XSS 기준과 같은 이유다 — 신뢰할 수 없는 입력이 렌더링 가능한 코드로 바뀌는 경로다.

## 크기와 터치 영역

아이콘은 보이는 크기와 터치 영역을 분리한다. 눌러서 쓰는 아이콘은 보이는 크기보다 큰 터치 영역을 가져야 한다. 아이콘 SVG 자체는 보이는 크기만 그리고, 터치 영역은 아이콘을 감싸는 interactive element(아이콘 버튼 등)가 padding이나 최소 크기로 만든다.

디자이너와 정한 값이다. 처음 전달받은 값(40/44/48, 2026-10-14)을 아래 기준으로 바꿨다. 값은 바뀔 수 있다.

| 크기   | 보이는 크기(Figma) | 터치 영역 |
| ------ | ------------------ | --------- |
| Small  | 16×16              | 32×32     |
| Medium | 20×20              | 40×40     |
| Large  | 24×24              | 40×40     |

- SVG의 실제 크기는 생성기가 파일명의 small·medium·large와 대조해 검증한다. 호출자는 크기별 named export를 고르고 숫자를 화면마다 복사하지 않는다.
- 터치 영역은 기존 spacing token `s14`(32), `s16`(40)에 대응한다. SVG 자체에는 padding이나 클릭 동작을 추가하지 않는다.
- 터치 영역이 이웃 요소의 터치 영역과 겹치지 않는지 확인한다.
- Large 40×40은 디자이너에게 확인을 요청한 값이다("Large를 40으로 해 줄 수 있는지"). 확정 전에는 Large 아이콘 버튼도 40을 기준으로 하되 바뀔 수 있다.
- Small(32)의 실제 사용 위치와 최소 터치 영역은 아직 확정되지 않았다. `IconButton`(`web/iconButton`)은 Large(24px 아이콘, 40×40 버튼)만 구현했고 Small 아이콘 버튼은 Figma에 없어 만들지 않았다.

## 색상 계약

공용 단색 아이콘은 소비자가 CSS `color`로 색을 제어할 수 있어야 한다.

- `svg/`의 중립 black fill·stroke는 생성 시 `currentColor`로 정규화한다.
- `none`, 투명도, 내부 fragment 참조는 유지한다. 흰색·제품 고유 색처럼 의도된 비중립 색상이 필요한 아이콘은 `svg-preserve/`에 둔다.

## 사용과 접근성

```tsx
import { Button, LineCameraMediumIcon, FillCircleCheckLargeIcon, LineCameraIcon } from '@app/design-system';

<Button size="md" leftIcon={<LineCameraMediumIcon />}>사진 추가</Button>
<FillCircleCheckLargeIcon aria-label="완료" className="text-icon-brand" />
// 실행 중 크기가 바뀌는 경우
<LineCameraIcon size={iconSize} />
```

고정 export는 `size` prop을 받지 않으며 선택한 원본 크기로 렌더한다. 선택용 export는 `size`를 주지 않으면 `md`(20px)다. 기본 SVG는 `aria-hidden="true"`, `focusable="false"`인 장식이다. 의미가 있는 독립 아이콘에는 `aria-label` 또는 `aria-labelledby`를 제공하면 `role="img"`로 노출된다. 아이콘 전용 버튼의 이름은 button에 제공하며, 버튼 안 SVG는 장식으로 유지한다. React SVG props·className·ref를 전달하고 CSS color를 상속한다.

`Foundations/Icons`의 Gallery story 하나에서 전체 세트·세 크기·색상 상속·Button 조합을 확인한다. 기존 Chromatic workflow가 이 story도 수집한다. 로컬 Storybook 검증과 원격 Chromatic 게시는 구분한다.

## 번들 경계

고정 크기 컴포넌트는 다른 크기를 import하지 않는다. 선택용 래퍼만 세 고정 크기를 import하므로 `size="md"` 리터럴을 줘도 세 도형이 포함된다. 크기가 정해진 Toast는 `FillCircleCheckLargeIcon`을 사용한다.

패키지 `sideEffects`는 CSS만 보존한다(`**/*.css`). 사용하지 않는 JS export와 그 하위 import는 제거 가능하며, CSS import는 유지된다. JS 모듈의 전역 등록·초기화 같은 부수 효과를 추가하면 이 선언도 재검토한다. `packages/design-system/scripts/icons-bundle.test.mjs`가 최상위 공개 barrel을 통해 한 크기만 남는지, 다른 컴포넌트 의존성이 제거되는지, 토큰 CSS가 보존되는지 실제 Vite 빌드로 검사한다. 측정 조건과 결과는 icon spec에 기록한다.

## Drift 감지

`--check` 모드는 현재 source SVG로 다시 생성했을 때의 결과와 커밋된 `generated/`를 비교해, 재생성을 깜빡한 변경을 CI에서 잡는다. source가 없어진 generated 파일(`stale`)도 함께 보고한다.

## 반입·갱신

1. Figma에서 small·medium·large 세 크기의 SVG를 모두 내려받고 이름·실제 크기·원본 색을 확인한다. 코드에서 정규화한 Figma 이름은 spec에 기록한다.
2. 단색은 `svg/`, 원본 색 보존은 `svg-preserve/`에 둔다. SVG는 안전성 검증 후 정규화한다.
3. `yarn workspace @app/design-system icons:build`를 실행한다. TSX 생성 뒤 `gen:index`가 전체 barrel을 갱신한다.
4. `yarn check:generated`, 대상 test·lint·typecheck와 Gallery를 확인한다.

생성기는 `packages/design-system/scripts/generate-icons.mjs`이며 `@svgr/core`·`@svgr/plugin-jsx`·`@svgr/plugin-svgo`는 개발 의존성이다. 생성기와 `gen:index`가 각각 TSX와 barrel을 소유하므로 생성 파일을 직접 수정하지 않는다. 아이콘 생성물은 일반 컴포넌트 scaffold 검사의 대상이 아니다.

`turbo/workflows/check-generated.mjs`가 `icons:check`를 실행하므로 기존 local `yarn verify`와 CI의 Generated files check에서 함께 검증한다.

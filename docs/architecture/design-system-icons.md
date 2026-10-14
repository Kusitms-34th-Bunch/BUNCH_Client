# Design System Icons (비활성 — 준비만 된 상태)

아직 실제 아이콘이 하나도 없어서 비활성이다. `packages/design-system/src/icons/`에 폴더 구조와 생성 스크립트만 준비해뒀고, `package.json` 스크립트·`@svgr` 의존성·CI 연결은 하지 않았다. 활성화 절차는 맨 아래를 확인한다.

## 왜 design-system인가

아이콘은 보통 여러 app이 같은 의미로 재사용하는 제품 비의존 asset이라 `docs/architecture/design-system-components.md`의 승격 기준과 같은 논리를 따른다.

- **design-system에 둔다**: 여러 app에서 같은 의미·모양으로 재사용하고, 제품 copy·route·API·logging에 의존하지 않는다.
- **app 내부에 둔다**: 한 app 또는 한 화면 전용이거나, 이름·노출 조건이 특정 도메인에 묶인다.

## 구조

```text
packages/design-system/src/icons/
  svg/            currentColor로 정규화할 원본 SVG(단색 아이콘)
  svg-preserve/   원본 색을 유지해야 하는 SVG(로고, 브랜드 마크)
  generated/      생성된 TSX 컴포넌트 + barrel index.ts (직접 수정 금지)
```

## 명명

원본 파일명을 PascalCase로 변환하고, `Icon`/`Logo`/`Brand`/`Symbol`/`Wordmark`로 끝나지 않으면 `Icon`을 붙인다.

```text
svg/chevron-down.svg          → generated/ChevronDownIcon.tsx
svg-preserve/brand-wordmark.svg → generated/BrandWordmark.tsx
```

## SVG 입력 검증 (필수)

SVGR은 sanitizer가 아니다. 외부에서 받은 SVG(특히 Figma export, 디자이너 전달 파일)를 그대로 신뢰하지 않는다. 생성 스크립트는 변환 전에 아래를 차단한다.

- `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`
- `on*` 이벤트 속성(`onclick`, `onload` 등)
- `javascript:` URL
- 같은 문서 내부 `#id` fragment가 아닌 외부 `href`/`xlink:href`

이 검증 없이 아이콘 생성 스크립트를 만들지 않는다. `docs/workflows/security-review.md`의 XSS 기준과 같은 이유다 — 신뢰할 수 없는 입력이 렌더링 가능한 코드로 바뀌는 경로다.

## 크기와 터치 영역

아이콘은 보이는 크기와 터치 영역을 분리한다. 눌러서 쓰는 아이콘은 보이는 크기보다 큰 터치 영역을 가져야 한다. 아이콘 SVG 자체는 보이는 크기만 그리고, 터치 영역은 아이콘을 감싸는 interactive element(아이콘 버튼 등)가 padding이나 최소 크기로 만든다.

디자이너가 전달한 값이다(2026-10-14). 값은 바뀔 수 있다.

| 크기   | 보이는 크기(Figma) | 터치 영역 |
| ------ | ------------------ | --------- |
| Small  | 16×16              | 40×40     |
| Medium | 20×20              | 44×44     |
| Large  | 24×24              | 48×48     |

- 이 숫자는 design-system의 한 곳(token 또는 상수)에만 정의하고, 컴포넌트와 화면에서는 `size`(small·medium·large) 값으로만 고른다. 숫자를 화면마다 복사하지 않는다.
- 값이 바뀌면 그 한 곳과 이 표만 고친다. 터치 영역이 보이는 크기와 다르다는 구조는 바뀌지 않는다.
- 터치 영역이 이웃 요소의 터치 영역과 겹치지 않는지 확인한다.
- Small(40)은 Apple HIG가 권장하는 최소 터치 크기 44pt보다 작다(확인 필요). 디자이너와 사용 위치를 맞춘다.

## 색상 계약

공용 단색 아이콘은 소비자가 CSS `color`로 색을 제어할 수 있어야 한다.

- `svg/`의 중립 black fill·stroke는 생성 시 `currentColor`로 정규화한다.
- `none`, 흰색, 제품 고유 색처럼 의도된 비중립 색상은 보존한다 — 이런 아이콘은 `svg-preserve/`에 둔다.

## Drift 감지

`--check` 모드는 현재 source SVG로 다시 생성했을 때의 결과와 커밋된 `generated/`를 비교해, 재생성을 깜빡한 변경을 CI에서 잡는다. source가 없어진 generated 파일(`stale`)도 함께 보고한다.

## 활성화하려면

1. 실제 아이콘이 반복적으로 필요해진 뒤에 진행한다(현재는 0개).
2. `packages/design-system`에 `@svgr/core`, `@svgr/plugin-jsx`, `@svgr/plugin-svgo`를 devDependency로 추가한다.
3. `.agents/future-skills/design-system-icons/generate-icons.mjs`를 `packages/design-system/scripts/`로 옮겨 그대로 쓰거나 필요에 맞게 조정한다. 의존성이 설치되기 전에는 lint와 boundary 검사에 걸리므로, 위 2번과 함께 옮긴다.
4. `package.json`에 `icons:build`(생성), `icons:check`(CI용 drift 확인) 스크립트를 등록한다.
5. `yarn verify` 또는 CI workflow에 `icons:check`를 포함한다.
6. 이 문서 상단의 "비활성" 표기를 지운다.

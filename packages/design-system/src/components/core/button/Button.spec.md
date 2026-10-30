# 컴포넌트: Button

## 메타데이터

- 소유 경계: design-system
- Status: 구현됨(실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `SolidButton`(node `115:761`). Figma 이름은 `SolidButton`이고 코드 이름은 `Button`이다. 이후 다른 모양의 버튼(아웃라인·아이콘 전용 등)이 디자인에 생기면 이름을 다시 정한다.

## 목적과 범위

### 제공하는 동작

- 여러 앱이 같은 모양과 접근성 계약으로 쓰는 공용 버튼. 글자 하나와 선택적인 앞·뒤 아이콘을 가진다.
- 변형 6개(`primary`, `secondary`, `tertiary`, `warning`, `brand`, `brandSubtle`) × 크기 3개(`lg`, `md`, `sm`).
- 기본, 눌림(`:active`), 비활성(`disabled`) 상태.

### 제공하지 않는 동작

- 로딩 상태, 아이콘만 있는 버튼, 전체 폭(`w-full`) variant, 링크 모양의 버튼은 디자인에 없어서 만들지 않았다. 필요하면 호출하는 쪽이 `className`으로 폭을 정하거나 `<a>`용 컴포넌트를 따로 만든다.
- hover 스타일은 디자인에 없어서 만들지 않았다.
- 아이콘 자산은 포함하지 않는다. Figma에서 보이는 chevron-left·add 아이콘은 교체 가능한 슬롯의 기본 예시라서, 호출하는 쪽이 `leftIcon`·`rightIcon`으로 넘긴다.

## Public API

- Props: `children`(필수, 접근성 이름), `variant`(기본 `primary`), `size`(기본 `lg`), `leftIcon`, `rightIcon`, 그리고 native `<button>`의 모든 속성(`onClick`, `disabled`, `type`, `aria-*`, `ref`, `className` 등).
- 이벤트: native `onClick` 등을 그대로 전달한다.
- Controlled / uncontrolled: 해당 없음(상태가 없다).
- 글자 크기: `typography-label-*`가 정하며 `text-sm` 같은 크기 클래스로는 바꿀 수 없다(바꾸려면 `typography-*`를 쓴다).
- 호출자 소유 책임: 버튼 글자(i18n·제품 문구), 클릭 동작, 아이콘 자산, 폭 같은 배치 클래스. `type`을 주지 않으면 `button`이라서 form 안에서 제출하려면 `type="submit"`을 준다.

## 상태와 동작

- Default: 변형별 배경·글자색. `tertiary`만 1px 테두리를 가진다.
- Variant·size: 크기는 높이 48/40/32, 좌우 패딩 24/16/12, 요소 간격 8/8/6, 아이콘 24/20/16, 글자 `label-l/m/s`.
- 눌림: 글자 아래에 검정 오버레이를 깐다. `warning`만 20%(`overlay-pressed`), 나머지는 10%(`overlay-hover`). 이 차이는 Figma 스크린샷 픽셀(10%와 20%)로 확인한 값이며, 의도한 규칙인지 디자이너 확인이 필요하다.
- 비활성: 모든 변형이 `surface-disabled` 배경과 `text-disabled` 글자색. `tertiary`는 테두리를 투명하게 둬서 크기가 바뀌지 않는다(Figma에서는 비활성 `tertiary`가 테두리 없이 2px 좁다).
- 긴 텍스트·overflow: 글자는 줄바꿈 없이 버튼 폭(부모 폭)을 넘으면 말줄임으로 잘린다(`truncate`, `max-w-full`). 접근성 이름은 전체 글자라서 스크린 리더에는 영향이 없지만 시각 사용자는 잘린 뒷부분을 볼 수 없다. 동작을 구분하는 중요한 문구(예: "…삭제")가 잘리지 않게 호출하는 쪽이 문구를 짧게 쓴다.
- 나란히 놓기: 버튼은 `shrink-0`라서 같은 flex 행의 두 버튼은 줄어들지 않고 행이 넘칠 수 있다. 좁은 폭에서 나란히 놓을 때는 호출하는 쪽이 `min-w-0 flex-1` 같은 클래스로 폭을 정한다(`SideBySide` story).
- 알려진 대비 한계(디자인 값, 코드에서 고치지 않음): `warning`의 흰 글자와 `#db3c19`의 대비는 약 4.5:1로 기준선에 걸쳐 있고, `brandSubtle` 눌림 상태의 글자 대비는 약 3.9:1이다. 비활성 글자(`#969aa0`)는 약 2.4:1이다(비활성 UI 요소는 대비 기준의 예외). 디자이너에게 공유한다.

- 상태 전환 (확정): 디자이너 공통 지침 `Dissolve / Ease Out / 75ms`를 따른다(2026-10-22 디자이너 공통 지침 변경: 100ms → 75ms). 곡선은 CSS Ease Out인 `cubic-bezier(0, 0, 0.58, 1)`로 명시한다. 누르는 동안 눌림 오버레이의 opacity를 전환하고, 놓으면 같은 시간·곡선으로 복원한다. Disabled ↔ Default는 배경·글자·테두리 색을 전환한다(해당 색상이 있는 variant). 크기·위치는 바꾸지 않으며 `prefers-reduced-motion: reduce`에서는 즉시 전환한다.

## 접근성

- Semantic element: native `<button>`.
- Accessible name·label: 글자가 이름이다. 아이콘은 `aria-hidden`이라 이름에 들어가지 않는다.
- Keyboard·focus: native button의 Enter·Space 동작. 키보드 focus 때만 `outline`(`border-brand` 색, 2px, offset 2px)이 보인다. 이 focus 스타일은 디자인에 없어서 접근성을 위해 추가한 것이다.
- 터치 영역: 흔히 권장하는 44px를 넘는 크기는 `lg`(48px)뿐이다. `md`(40px)와 `sm`(32px)은 디자인이 정한 값이며 44px보다 작아서, 터치 중심 화면에서는 `lg`를 쓰는 것을 권장하고 이후 정책이 정해지면 반영한다. 더블탭 줌 지연을 막으려고 `touch-action: manipulation`을 적용했다.
- Error 안내: 해당 없음.

## Styling과 의존성

- Token·기존 primitive: 모두 기존 토큰(`bg-surface-*`, `text-text-*`, `border-border-secondary`, `rounded-r4`, `h-s14/16/18`, `px-s6/8/12`, `gap-s3/4`, `typography-label-l/m/s`, `bg-overlay-hover/pressed`). 하드코딩한 색·간격 값이 없다. 변형·크기는 `tailwind-variants`(`tv`)로 선언하고(slots: `base`·`icon`·`label`), 호출하는 쪽의 `className`은 `tv` 호출에 넘겨 한 곳에서 병합한다.
- 허용되는 dependency: `tailwind-variants`(변형 선언). 병합은 기존 `tailwind-merge`를 쓰며, `cn`과 `tv`가 같은 설정(토큰 이름 등록)을 공유한다.
- 토큰 차이 (해소, 2026-10-19): 저장소 `surface-brand-subtle-1`이 `#e2e4ff`(`bunch-100`)로 Figma(`#f1f2ff`, `bunch-50`)와 달랐으나 `develop`의 PR #60으로 `bunch-50`이 되어 `brandSubtle`이 Figma와 같아졌다(코드 변경 없음).
- Figma 변형 이름 `Scondary`는 오타로 보고 코드에서는 `secondary`로 쓴다.
- Storybook state matrix: `Matrix`(변형 × 크기 × 기본·비활성), `WithIcons`, `Disabled`, `LongLabel`, `SideBySide`. 눌림은 `:active`라서 표로 재현할 수 없어 직접 눌러 확인한다. Storybook은 `.storybook/storybook.css`로 Tailwind와 토큰 CSS를 연결한다.
- 웹 앱에서 쓸 때: 앱의 `globals.css`가 디자인 시스템 소스를 Tailwind 스캔 범위에 넣어야(`@source`) 클래스가 만들어진다. 첫 소비자를 연결할 때 함께 확인한다.

## 확인할 항목

- `brandSubtle` 배경 토큰 (해소, 2026-10-19): 위 "토큰 차이"와 같다. 저장소와 Figma가 `#f1f2ff`로 같다.
- 눌림 오버레이 (미정): Warning만 20%인 것이 의도인지 디자이너에게 확인한다.
- 이름 (제안): Figma `SolidButton`은 코드에서 `Button`, 오타 `Scondary`는 `secondary`로 쓴다.
- Figma에 없는 추가 (제안): focus-visible outline, 긴 글자 말줄임, `touch-manipulation`, `type="button"` 기본값. 필요 없으면 제거한다.
- 터치 영역 (미정): `md`(40px)·`sm`(32px)이 44px 미만인 점의 정책을 디자이너·기획과 정한다.

## 검증

- [x] 사용자 관찰 동작 test(이름, 기본 type, 클릭, 비활성, 아이콘 접근성 이름, className·native 속성 전달, 긴 글자)
- [x] 지원 variant·edge state story(`Matrix`, `WithIcons`, `Disabled`, `LongLabel`, `SideBySide`)
- [x] public export 영향 확인(`yarn check:generated`)
- [x] 실행 command와 결과: `yarn workspace @app/design-system test`·`lint`·`typecheck`
- [ ] Figma 대조: 웹 임시 미리보기에서 54개 케이스(변형 6 × 크기 3 × 기본·눌림·비활성 3)의 높이·패딩·간격·글자·배경·글자색·테두리·눌림 오버레이를 Figma 사양과 대조했으나 미리보기를 저장소에 남기지 않아 재현 증거가 없다
- [ ] Storybook 렌더 확인: 로컬 정적 빌드의 `Matrix`에서 변형 6 × 크기 3 × 기본·비활성이 토큰대로 보였으나 저장소에 재현 증거가 없다. Chromatic 첫 빌드로 대체한다(눌림·focus는 미확인)
- [ ] 390px 폭·키보드 focus 모양·iOS WebView의 `:active`·Windows 고대비 모드·실기기

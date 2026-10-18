# 컴포넌트: TextButton

## 메타데이터

- 소유 경계: design-system
- Status: 구현됨(Figma 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `TextButton`(node `115:798`). Figma 이름과 코드 이름이 같다. 폴더 이름 `textButton`은 generator 규칙을 따른다.

## 목적과 범위

### 제공하는 동작

- 배경 없이 글자만 보이는 공용 버튼. 글자 하나와 선택적인 앞·뒤 아이콘을 가진다.
- variant 3개(`primary`, `secondary`, `warning`) × 크기 3개(`lg`, `md`, `sm`).
- 기본, 눌림(`:active`), 비활성(`disabled`) 상태.

### 제공하지 않는 동작

- 로딩 상태, 아이콘만 있는 버튼, 링크 모양(`<a>`)은 디자인에 없어서 만들지 않았다.
- hover 스타일은 디자인에 없어서 만들지 않았다.
- 아이콘 자산은 컴포넌트가 직접 갖지 않는다. Figma의 앞·뒤 아이콘은 `chevron-left`를 기본으로 보여 주는 교체 가능한 슬롯이라서, 호출하는 쪽이 `leftIcon`·`rightIcon`으로 넘긴다. 저장소의 `LineChevronLeftIcon`의 `size`(`sm`·`md`·`lg` = 16/20/24)가 Figma 인스턴스와 같은 자산이며 `WithIcons` story에서 크기별로 쓴다.

## Public API

- Props: `children`(필수, 접근성 이름), `variant`(기본 `secondary`), `size`(기본 `lg`), `leftIcon`, `rightIcon`, 그리고 native `<button>`의 모든 속성(`onClick`, `disabled`, `type`, `aria-*`, `ref`, `className` 등).
- 이벤트: native `onClick` 등을 그대로 전달한다.
- Controlled / uncontrolled: 해당 없음(상태가 없다).
- 글자 크기: `typography-label-*`가 정하며 `text-sm` 같은 크기 클래스로는 바꿀 수 없다(바꾸려면 `typography-*`를 쓴다).
- 호출자 소유 책임: 버튼 글자(i18n·제품 문구), 클릭 동작, 아이콘 자산, 폭 같은 배치 클래스. `type`을 주지 않으면 `button`이라서 form 안에서 제출하려면 `type="submit"`을 준다.

## 상태와 동작

- Default: 배경 없음. 글자색은 `primary` `text-brand`, `secondary` `text-secondary`, `warning` `system-fail-text`(대비는 확인할 항목 참고).
- Variant·size: 크기는 높이 48/40/32, 좌우 패딩 24/16/12, 요소 간격 8/8/6, 아이콘 24/20/16, 글자 `label-l/m/s`. 반경 `r4`. 모두 Button과 같다.
- 눌림: 글자 아래에 `overlay-hover`(검정 10%) 오버레이를 깐다. 세 variant 모두 같다(Figma `Pressed`가 `overlay-hover` 변수를 쓴다).
- 비활성: 세 variant 모두 `text-disabled` 글자색. 눌림 오버레이는 켜지지 않는다.
- 긴 텍스트·overflow: 글자는 줄바꿈 없이 부모 폭을 넘으면 말줄임으로 잘린다(`truncate`, `max-w-full`). 접근성 이름은 전체 글자라서 스크린 리더에는 영향이 없지만 시각 사용자는 잘린 뒷부분을 볼 수 없다. 동작을 구분하는 중요한 문구가 잘리지 않게 호출하는 쪽이 문구를 짧게 쓴다.
- 나란히 놓기: 버튼은 `shrink-0`라서 같은 flex 행의 두 버튼은 줄어들지 않고 행이 넘칠 수 있다. 좁은 폭에서 나란히 놓을 때는 호출하는 쪽이 `min-w-0 flex-1` 같은 클래스로 폭을 정한다(`SideBySide` story).
- 알려진 대비 한계(디자인 값, 코드에서 고치지 않음): 비활성 글자(`#969aa0`)는 흰 배경에서 약 2.8:1이다(비활성 UI 요소는 대비 기준의 예외). 눌림 오버레이 위의 `primary`·`warning` 글자 대비는 렌더로 재지 않았다.

## 접근성

- Semantic element: native `<button>`.
- Accessible name·label: 글자가 이름이다. 아이콘은 `aria-hidden`이라 이름에 들어가지 않는다.
- Keyboard·focus: native button의 Enter·Space 동작. 키보드 focus 때만 `outline`(`border-brand` 색, 2px, offset 2px)이 보인다. 배경이 없어 focus가 보이지 않으면 사용할 수 없어서 접근성을 위해 추가했고, 디자인에는 없다.
- 터치 영역: `md`(40px)와 `sm`(32px)은 디자인이 정한 값이며 흔히 권장하는 44px보다 작다. 터치 중심 화면에서는 `lg`를 권장한다. 더블탭 줌 지연을 막으려고 `touch-action: manipulation`을 적용했다.
- Error 안내: 해당 없음.

## Styling과 의존성

- Token·기존 primitive: 모두 기존 토큰(`text-text-brand`, `text-text-secondary`, `text-system-fail-text`, `text-text-disabled`, `rounded-r4`, `h-s14/16/18`, `px-s6/8/12`, `gap-s3/4`, `typography-label-l/m/s`, `bg-overlay-hover`). 하드코딩한 값이 없다. 선언 방식은 Button과 같다(`tv` slots `base`·`icon`·`label`).
- 허용되는 dependency: `tailwind-variants`.
- Figma 이름 대응: `varient`→`variant`, `rIghtIcon`→`rightIcon`, `Size L/M/S`→`lg/md/sm`, 아이콘 boolean(`leftIcon`·`rIghtIcon`)과 `swapIconL/M/S`→ReactNode 슬롯 `leftIcon`·`rightIcon`(크기별 슬롯 크기는 `size`가 정한다).
- Storybook state matrix: `Matrix`(variant × 크기 × 기본·비활성), `WithIcons`, `Disabled`, `LongLabel`, `SideBySide`. 눌림은 `:active`라서 직접 눌러 확인한다.
- 웹 앱에서 쓸 때: 앱의 `globals.css`가 디자인 시스템 소스를 Tailwind 스캔 범위에 넣어야(`@source`) 클래스가 만들어진다. Button과 같다.

## 확인할 항목

- Warning 글자색 대비: 토큰 원본의 `system-fail-text`가 `red-500`(`#f04d29`)을 참조한다. 흰 배경에서 대비가 약 3.7:1이므로 일반 크기 텍스트의 WCAG AA 기준 4.5:1 충족 여부는 별도 디자인 확인이 필요하다.
- Pressed 오버레이 (확정): Figma가 세 variant 모두 `overlay-hover`(10%)다. Button의 Warning 20%와 달라서 의도한 차이인지 디자이너에게 확인한다.
- 이름 (확정): variant `primary`(브랜드 색 글자)는 Figma 이름을 따랐다. Button의 `primary`(검정 반전 배경)와 모양이 다르다.
- Figma에 없는 추가 (제안): focus-visible outline, 긴 글자 말줄임, `touch-manipulation`, `type="button"` 기본값. 필요 없으면 제거한다.
- 터치 영역 (미정): `md`·`sm`이 44px 미만인 점의 정책을 디자이너·기획과 정한다.

## 검증

- [x] 사용자 관찰 동작 test(이름, 기본 type, 클릭, 비활성, 아이콘 접근성 이름, className·native 속성 전달, variant·크기 class, 눌림 오버레이, 긴 글자)
- [x] 지원 variant·edge state story(`Matrix`, `WithIcons`, `Disabled`, `LongLabel`, `SideBySide`)
- [x] public export 영향 확인(`yarn gen:index`로 export 추가, `yarn check:generated`는 Windows에서 `yarn.cmd` spawn 오류(`EINVAL`)로 실행되지 않아, 그 안의 검사를 직접 실행해 대체했다: `icons:check`·`gen:index:check`·`check-ds-components.mjs`·`tokens:check` 모두 통과)
- [x] 실행 command와 결과: `yarn workspace @app/design-system test`·`lint`·`typecheck` 통과
- [x] `bunch-ui-accessibility-reviewer` 검토(Critical·High 없음, 시각·실기기 검증은 공백)
- [ ] Figma 대조: variant 3 × 크기 3 × 기본·눌림·비활성 27개 케이스의 높이·패딩·간격·글자·글자색·눌림 오버레이를 Figma 사양과 대조한다
- [ ] Storybook 렌더 확인(눌림·focus 포함)
- [ ] 390px 폭·키보드 focus 모양·iOS WebView의 `:active`·실기기

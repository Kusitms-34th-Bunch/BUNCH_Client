# Web Interface Guidelines

`docs/architecture/components.md`의 접근성 기준을 보완하는 구체 체크리스트다. 화면·폼·목록처럼 사용자가 직접 조작하는 UI를 만들거나 리뷰할 때 확인한다. 라이브러리가 필요한 항목(가상화 등)은 실제로 반복되는 비용 근거가 있을 때만 도입한다.

## 포커스

- 모든 interactive element는 보이는 focus 상태가 있어야 한다. `outline: none`을 focus 대체 없이 쓰지 않는다.
- 클릭으로 생기는 focus ring을 피하려면 `:focus`가 아니라 `:focus-visible`을 쓴다.
- sticky header·footer·overlay가 focus된 요소를 가리지 않게 한다.

## 폼

- input에는 의미에 맞는 `autocomplete`, `type`(`email`, `tel`, `url`, `number`), `inputmode`를 지정한다.
- `onPaste`로 붙여넣기를 막지 않는다.
- label은 `htmlFor` 또는 control을 감싸 클릭 가능하게 한다.
- 이메일·코드·사용자명 입력은 `spellCheck={false}`를 검토한다.
- checkbox·radio는 label과 control이 하나의 히트 영역을 공유하게 한다.
- 제출 버튼은 요청이 시작되기 전까지 비활성화하지 않고, 요청 중에는 spinner로 상태를 보여준다.
- 에러는 해당 필드 옆에 표시하고, 제출 시 첫 에러 필드로 focus를 옮긴다.
- placeholder는 예시 패턴을 보여주고 `…`로 끝낸다.
- 저장되지 않은 변경이 있는 상태로 이동하면 경고한다(`beforeunload` 또는 router guard).

## 타이포와 콘텐츠

- 말줄임표는 `...`이 아니라 `…`을 쓴다. "Loading…"처럼 로딩 상태도 `…`로 끝낸다.
- 숫자를 나열·비교하는 곳에는 `font-variant-numeric: tabular-nums`를 적용해 자릿수가 바뀌어도 폭이 흔들리지 않게 한다.
- heading처럼 줄바꿈 위치가 중요한 텍스트는 `text-wrap: balance` 또는 `text-pretty`를 검토한다.
- 긴 텍스트를 담는 컨테이너는 `truncate`, `line-clamp-*`, `break-words` 중 상황에 맞는 것으로 처리한다. flex 자식에서 truncate가 안 먹으면 `min-w-0`이 빠진 것인지 확인한다.
- 빈 문자열·빈 배열에 깨진 레이아웃을 그대로 렌더링하지 않고 empty state를 명시한다.

## 이미지

- `<img>`에는 `width`·`height`(또는 `next/image`의 동급 속성)를 명시해 CLS를 막는다.
- 화면 아래쪽 이미지는 `loading="lazy"`, 최초 화면의 핵심 이미지는 우선 로딩(`next/image`의 `priority` 등)을 적용한다. 자세한 기준은 `docs/workflows/performance.md`의 이미지 절을 따른다.

## 성능

- 화면에 렌더링 중 `getBoundingClientRect`, `offsetHeight`, `offsetWidth`, `scrollTop` 같은 layout read를 넣지 않는다. 필요하면 effect나 이벤트 핸들러로 분리한다.
- 50개 이상의 긴 목록은 virtualization 또는 `content-visibility: auto`를 검토한다. 외부 라이브러리는 실제로 느려지는 걸 확인한 뒤 도입한다.
- 가능하면 uncontrolled input을 우선하고, controlled가 필요하면 매 keystroke마다 수행하는 작업을 가볍게 유지한다.

## Navigation과 상태

- 필터, 탭, pagination, 펼침 상태처럼 뒤로가기·공유가 의미 있는 state는 URL(query param)에 반영하는 것을 검토한다.
- 네비게이션은 `<a>`/`Link`를 사용해 새 탭 열기, 가운데 클릭이 동작하게 한다. `onClick`만으로 페이지를 이동시키지 않는다.
- 되돌릴 수 없는 액션은 확인 모달 또는 되돌리기 가능한 시간(undo window)을 둔다. 확인 없이 즉시 실행하지 않는다.

## Touch와 인터랙션

- 터치 대상에는 `touch-action: manipulation`을 적용해 더블탭 줌 지연을 없앤다.
- 눌러서 쓰는 아이콘은 보이는 크기보다 큰 터치 영역을 가져야 한다. 크기별 값은 `docs/architecture/design-system-icons.md`의 "크기와 터치 영역"을 따르고, 화면에서 숫자를 직접 쓰지 않는다.
- 모달·drawer·시트에는 `overscroll-behavior: contain`을 적용해 배경 스크롤로 번지지 않게 한다.
- drag·swipe 같은 제스처 전용 액션에는 탭·클릭과 키보드 대안을 함께 제공한다. 제스처가 유일한 경로가 되지 않게 한다.

## Drag와 제스처

WebView 쉘(`docs/architecture/mobile-shell.md`)에서도 체감이 유지되도록, 드래그·스와이프는 아래 기준으로 구현한다.

- 이벤트는 `touch`/`mouse`를 따로 쓰지 않고 `pointer` 이벤트로 통일한다.
- 드래그 대상에는 `touch-action: none`(또는 필요한 축만 허용)을 적용해 브라우저 스크롤·줌과 경쟁하지 않게 한다.
- 이동은 `transform: translate3d`로 처리한다. 드래그 중 `top`/`left`/`width` 같은 layout 속성을 바꾸지 않는다.
- 드래그 중 위치는 ref·CSS 변수·애니메이션 프레임으로 갱신하고, 매 pointermove마다 React state를 갱신해 리렌더링하지 않는다. 드롭 시점에만 state에 반영한다.
- 스크롤 영역 안의 드래그는 스크롤과 구분되는 시작 조건(핸들, 길게 누르기 등)을 둔다.
- 화면 가장자리 스와이프는 iOS 뒤로가기 같은 시스템 제스처와 충돌하므로, 드래그 영역을 가장자리에서 띄운다.
- 드래그 대상이 되는 큰 이미지는 크기를 줄인 썸네일이나 `will-change: transform`이 필요한 요소로 한정한다. 상시 `will-change`는 메모리를 쓰므로 드래그 중에만 건다.
- 이 기준은 일반적인 웹 성능 지침이며, 실제 화면은 실기기에서 확인한 뒤 기준을 보강한다.

## WebView 주의 사항

iOS WKWebView에서 알려진 사례다. 번치 쉘(`react-native-webview`)의 실기기에서는 아직 확인하지 않았으므로, 해당 UI를 만들 때 먼저 확인할 목록으로 쓴다.

- input 글자 크기가 16px 미만이면 iOS가 포커스 때 화면을 확대한다. viewport `maximum-scale`로 막으면 접근성이 나빠지고 실기기에서도 안정적이지 않았으므로, 입력 글자는 16px 이상으로 둔다.
- iOS WebKit은 input 포커스 때 `body { overflow: hidden }`을 무시하고 document를 스크롤할 수 있다. 시트·모달이 열린 동안 배경을 고정해야 하면 `position: fixed; inset: 0`처럼 document 스크롤 경로 자체를 없앤다.
- 하단 고정 영역(bottom nav, 시트 버튼, FAB)은 `env(safe-area-inset-bottom)`을 더한다. 바 위로 튀어나온 장식까지 포함한 실제 가림 높이는 바 높이와 다르다. 화면마다 여백 매직 넘버를 두지 말고 공용 CSS 변수 하나로 둔다. 이 저장소는 `--safe-area-top`·`--safe-area-bottom`(`apps/web/src/app/globals.css`)이고 `AppFrame`이 한 번만 적용하므로, 화면에서 `env(safe-area-inset-*)`를 직접 더하지 않는다.
- 오버레이가 겹칠 때(시트 위의 확인 모달) 아래 시트의 닫기는 다음 오버레이가 표시된 뒤에 호출한다. 먼저 닫으면 두 오버레이가 동시에 사라진다.
- 롱프레스로 시작하는 제스처는 시작 컨테이너 자체에 `user-select: none`(`-webkit-user-select: none`)을 둔다. 자식에만 걸면 텍스트 선택이 먼저 잡혀 다음 탭이 무시된다.

## 다크 모드

- 다크 테마를 지원하면 `<html>`에 `color-scheme: dark`를 적용해 스크롤바·네이티브 input 색이 맞게 한다.

## i18n

- 날짜·시간은 직접 포맷하지 않고 `Intl.DateTimeFormat`을, 숫자·통화는 `Intl.NumberFormat`을 쓴다.
- 브랜드명·코드 토큰처럼 번역되면 안 되는 텍스트는 `translate="no"`로 감싼다.

## Hydration

- `value`가 있는 controlled input에는 반드시 `onChange`가 있어야 한다. 그렇지 않으면 `defaultValue`로 uncontrolled 처리한다.
- 날짜·시간처럼 서버·클라이언트에서 다르게 계산될 수 있는 값은 hydration mismatch를 확인한다. 자세한 기준은 `docs/code-quality/contracts.md`의 React 상태와 DOM 의미 절을 따른다.
- `suppressHydrationWarning`은 정말 필요한 경우(브라우저 확장이 주입하는 속성 등)에만 쓴다.

## Anti-pattern

- `transition: all` — 애니메이션할 property를 명시한다.
- `outline-none`을 focus 대체 없이 사용
- `<div>`·`<span>`에 클릭 핸들러만 붙이고 `<button>`을 쓰지 않음
- 아이콘 전용 버튼에 `aria-label` 누락
- 치수 없는 이미지, 가상화 없는 큰 배열 렌더링
- 날짜·숫자를 하드코딩된 문자열 포맷으로 직접 조립
- 명확한 이유 없는 `autoFocus`

## 참고

- 이 문서는 `docs/architecture/components.md`, `docs/agent/roles/ui-accessibility-reviewer.md`와 함께 쓴다. 겹치는 항목은 두 문서 모두 다시 쓰지 않고 한쪽만 기준으로 둔다.

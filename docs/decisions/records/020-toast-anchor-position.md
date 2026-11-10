# 020: 토스트 위치는 화면 요소의 앵커로 정하고, 화면 이동 뒤 토스트는 도착 화면에서 띄운다

- 상태: accepted
- 구현 상태(2026-11-10): 구현됨(`toast()`의 앵커 계산, `PageShell`·`MainTabBar`의 `data-toast-anchor`, `toastAfterNavigation()`·`<PendingToast />`). iOS WebView 실기기 확인 전.

## 배경

토스트 아래 여백을 화면마다 `bottomOffset` 숫자(77, 72, 65, 42, 32, 170)로 손으로 계산해 넘겼다. 같은 의미의 값이 중복되고, 탭 막대·버튼 영역 높이가 바뀌어도 따라가지 않으며, iOS 쉘처럼 탭 막대가 없는 환경에서는 어긋났다. 화면을 이동하면서 토스트를 부르는 호출(`router.replace` 직후 `toast()`)은 이동 전 화면 기준 위치로 떴다.

## 결정

- 위치: 화면 요소가 `data-toast-anchor`를 달고, `toast()`가 부르는 순간 보이는 앵커의 위 끝을 재서 위치를 정한다. 하단 고정 영역(`wrapper`)은 위 4px, 하단 탭 막대(`tab-bar`)는 위 16px이고, 앵커가 없으면 기존 기본 위치(Safe Area + 16px)다. `bottomOffset` 옵션은 제거한다. 폭은 Figma가 343으로 통일돼 목록 폭을 기본(`fullWidth: true`)으로 한다.
- 노출 시점: 이동이 없으면 동작 결과가 나온 즉시 `toast()`를 부른다. 이동이 있으면 `toastAfterNavigation()`으로 예약하고, 앱 layout의 `<PendingToast />`가 경로 변경 → 도착 화면 전체 로딩(`PageLoading`) 종료 → 화면 전환 애니메이션 종료(`data-page-leaving` 없음) 뒤에 `toast()`를 부른다.
- 앵커 계약은 디자인 시스템(`toast()`)이 알고, 이동 규칙(`PendingToast`)은 라우터를 아는 앱이 소유한다.

## 검토한 대안

- **CSS 변수를 화면이 계속 게시**: 하단 영역 높이를 `ResizeObserver`로 루트 변수에 올린다. 화면 전환 중 두 화면이 함께 마운트되고, 슬라이드 전환 중에 잰 위치가 전환이 끝나도 갱신되지 않아 틀릴 수 있다. 부르는 순간 재는 방식이 키보드·입력란 줄 수 변화도 그대로 반영한다.
- **화면마다 상수 유지**: 수동 계산이 계속 흩어지고 Figma와 어긋난다.

## 영향

- 새 하단 고정 영역은 `PageShell`의 `bottom` 슬롯을 쓰면 자동으로 앵커가 된다. 슬롯 밖 고정 요소는 `data-toast-anchor="wrapper"`를 직접 단다.
- 이동하면서 알리는 새 호출은 `toast()`가 아니라 `toastAfterNavigation()`을 쓴다.
- 플로팅 버튼은 토스트 위치에 영향을 주지 않는다. 피드·번치 홈의 「+」 높이 정렬(77)은 없어지고 탭 막대 위 16px로 통일된다.
- 관련: [008](./008-toast-sonner.md), `packages/design-system/src/components/core/toast/Toast.spec.md`

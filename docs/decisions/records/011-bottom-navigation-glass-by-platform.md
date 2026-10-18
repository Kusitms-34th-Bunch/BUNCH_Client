# 011: 하단 내비게이션의 글라스 효과는 플랫폼별로 나눠 구현한다

- 상태: accepted
- 구현 상태(2026-10-18 확인): web·안드로이드용 CSS `glass` 옵션은 구현됨(`BottomNavigation`). iOS 쉘의 네이티브 막대는 코드로 구현했지만(`apps/mobile-shell/src/native-tab-bar/NativeTabBar.tsx`, `packages/bridge`의 `setNativeTabBar`·`nativeTabPress`) iPhone 실기기에서 쉘 앱으로는 확인하지 않았다. 막대 모양과 WebView 확장은 별도 실험 앱(iPhone iOS 26.6.2, Expo Go)으로만 확인했다. 웹에서 이 계약을 호출하는 탭 조합은 탭 화면이 생긴 뒤 구현한다(`docs/specs/bottom-navigation.md`).

## 배경

토스·배민(iOS 26) 탭 바처럼 뒤 내용이 비치고 가장자리가 번지는 효과를 웹으로 낼 수 있는지 비교했다. 디자인(Figma)에 정의된 효과가 아니라 개발 쪽에서 임의로 적용하는 효과다.

## 결정

- web과 안드로이드는 웹 `BottomNavigation`의 `glass` 옵션(CSS `backdrop-filter`: 흰색 60%, 블러 8px, 채도 200%, 안쪽 반사 그림자)을 쓴다. 굴절은 제외한다.
- iOS 쉘(iOS 26 이상, `isLiquidGlassAvailable()`이 true)은 WebView 위에 네이티브 `GlassView`(`expo-glass-effect`) 막대를 얹고, 이때 웹의 탭 막대는 숨긴다. WebView는 막대 뒤까지 그려져야 효과가 보인다.
- iOS 26 미만이나 `GlassView`를 못 쓰는 환경은 웹 막대를 그대로 쓴다.
- 화면 내용은 계속 WebView(Next.js)가 그린다. 쉘이 맡는 것은 iOS의 탭 막대 하나다. 탭 상태·숨김·여백은 `bridge`로 주고받는다.

## 비교한 대안

- CSS `backdrop-filter`만 사용: 모든 플랫폼에서 같고 안정적이다. 가장자리 번짐(굴절)이 없다. 실기기 iPhone WebView에서 동작을 확인했다.
- SVG 변위 굴절(`liquid-glass-react`, kube.io 방식): Chromium에서만 보이고 WebKit(iOS)에서는 굴절이 사라진다. 플랫폼마다 모양이 달라져 제외했다.
- WebGL 라이브러리(`dashersw/liquid-glass-js`, `ybouane/liquidglass`): WebKit에서 렌더되지만 페이지를 한 번 캡처하는 구조라 `PageShell`의 안쪽 스크롤에서 배경이 낡은 이미지로 남는다. 스크롤이 멈춘 뒤 재캡처하면 갱신되지만 스크롤 중 어긋나고, `html2canvas` 1.4.1이 Tailwind v4의 `oklch()` 색에서 오류를 낸다. 제외했다.
- `expo-router`의 네이티브 탭(`NativeTabs`): iOS 26에서 시스템 탭 바를 쓰지만 쉘 구조를 크게 바꾸고 WebView 사용 방법이 문서에 없다. 대신 WebView 위에 `GlassView`를 얹는 방식을 택했다.
- iOS WebView를 Chromium으로 바꾸기: 앱스토어 지침 2.5.6으로 WebKit이 필수라 불가(EU 예외만 있음).

## 근거

- iPhone iOS 26.6.2 실험(Expo Go): WebView 위 `GlassView`가 막대 뒤 웹 내용을 비추고 가장자리에 뒤 색이 번졌다. WebView가 막대 위까지만이면 효과가 사라졌다. WebView 안의 CSS 막대도 동작했다.
- 비교 사진·시험: 로컬 노트(`.agents/notes/liquid-glass/`)에 있고 저장소에는 올리지 않는다.

## 결과

- web·안드로이드·iOS 26 미만은 CSS 막대, iOS 26 이상 쉘은 네이티브 막대로 모양이 약간 다르다. 디자인에 없는 효과라 이를 허용한다.
- 쉘이 WebView 밖의 네이티브 UI를 갖게 되어 `docs/architecture/mobile-shell.md`의 "WebView 밖의 네이티브 UI는 오류 화면뿐"이라는 전제가 바뀐다. 현재 구조와 소스 배치를 해당 문서에 반영했다.
- 탭 상태·숨김·눌림 이벤트는 `packages/bridge` 계약으로 정의했고 쉘에서 구현했다. 웹 탭 조합의 호출·이벤트 수신·하단 여백 적용과 실기기 VoiceOver 검증은 남아 있다.

## 다시 검토할 조건

- 실기기에서 스크롤 프레임이나 눌림 반응이 나쁘면 네이티브 막대를 취소하고 CSS 막대로 통일한다.
- 디자이너가 이 효과를 정식 사양으로 정하면 값을 그 기준으로 바꾼다.
- 안드로이드를 출시 대상에 넣으면 안드로이드 WebView(Chromium 계열)에서 SVG 변위 굴절(`backdrop-filter: url(#...)`)을 점진 향상으로 더할지 검토한다. 이번에는 확인하지 않았고, 출시 대상이 iOS뿐이라 넣지 않았다.
- WebView가 시스템 탭 바 아래로 확장되는 동작이 Expo·React Native 버전 변경으로 달라지면 다시 확인한다.

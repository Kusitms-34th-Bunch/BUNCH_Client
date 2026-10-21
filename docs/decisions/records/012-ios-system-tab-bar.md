# 012: iOS 쉘의 하단 탭은 시스템 탭 바를 쓰고 탭마다 WebView를 둔다

- 상태: accepted
- 대체: [011](./011-bottom-navigation-glass-by-platform.md)의 iOS 부분(웹·안드로이드의 CSS 막대는 그대로)
- 구현 상태(2026-10-22 확인): 구현됨. iOS 시뮬레이터(iPhone 17 Pro, iOS 26.5)에서 시스템 탭 바·탭 전환·아이콘·라벨을 확인했다. 실기기, 끌어서 이동·렌즈 효과의 실제 터치, 탭 사이 로그인 쿠키 공유, 메모리는 확인하지 못했다.

## 배경

011은 iOS 26 이상 쉘에서 WebView 위에 `GlassView`(`expo-glass-effect`)로 막대를 직접 그리고, 알약 이동과 끌기 동작을 코드로 만들었다. 시뮬레이터에서 보니 무신사·배민 같은 iOS 26 앱의 막대와 동작이 달랐다. 그 앱들은 iOS 시스템 탭 바(UITabBar)를 쓰고, 눌러서 끌기·물방울 렌즈·알약 아래 아이콘 강조를 시스템이 그린다. Apple은 이 렌즈 효과를 따로 쓸 수 있게 공개하지 않아 직접 만든 막대로는 흉내만 낼 수 있다.

## 결정

- iOS 쉘은 시스템 탭 바를 쓴다. iOS 26 이상은 시스템이 Liquid Glass로 그리고, 그 미만은 기본 탭 바다.
- 시스템 탭 바는 탭마다 화면을 갖는 구조라 탭마다 WebView를 하나씩 둔다. 각 WebView는 웹이 알려 준 탭 경로를 연다.
- 첫 화면(로그인·온보딩)은 하나의 WebView다. 웹 탭 화면이 `setNativeTabBar`를 부르면 쉘이 탭 화면으로 바꾸고, `hidden: true`면 하나의 WebView로 돌아간다.
- 라이브러리는 expo-router의 네이티브 탭(`expo-router/unstable-native-tabs`, SDK 57)이다. 쉘 진입점은 `index.ts`에서 Sentry를 초기화한 뒤 `expo-router/entry`를 불러온다.
- 탭 라벨·경로는 웹이 정하고, 아이콘은 쉘이 탭 ID로 정한다(웹 막대와 같은 디자인 시스템 아이콘을 PNG로 옮김). 선택 색·라벨 크기는 디자인 토큰 값을 옮긴다.
- 웹·안드로이드·브라우저는 기존 웹 `BottomNavigation`을 쓴다(011의 CSS 막대).

## 비교한 대안

- **011 방식 유지(직접 만든 GlassView 막대)**: 알약 크기·간격을 디자인과 똑같이 맞출 수 있지만 렌즈 효과가 없고, 끌기·알약 계산 코드와 그 테스트를 직접 유지해야 한다.
- **React Navigation 네이티브 탭(`@react-navigation/bottom-tabs/unstable`)**: 쉘이 expo-router를 쓰지 않아 구조 변경이 작지만 react-native-screens 4.30 이상이 필요하다. Expo SDK 57이 고정한 버전은 4.26이라 SDK 호환 범위를 벗어난다.
- **막대만 떼어 WebView 하나 위에 시스템 탭 바 올리기**: 시스템 탭 바(UITabBarController)는 탭마다 화면을 바꾸는 구조라 공식적으로 지원되지 않는다.
- **칸 폭을 줄여 알약을 웹 크기(80×56)로 맞추기**: `UITabBar`의 `itemPositioning = .centered`·`itemWidth = 80`을 넣어 실험했지만 iOS 26 시뮬레이터에서 알약 폭(약 95pt)이 그대로였다. Liquid Glass 탭 바는 칸 배치를 시스템이 정하는 것으로 판단했다.

## 결과

- 끌기·렌즈 효과·접근성(VoiceOver·큰 글씨·길게 눌러 라벨 확대)은 시스템이 맡고, 직접 만든 막대 코드(`src/native-tab-bar/`)와 `nativeTabPress` 이벤트, `expo-glass-effect`·`expo-symbols` 직접 의존을 지웠다.
- 알약 크기, 막대 높이·여백, 아이콘과 라벨 간격은 맞출 수 없다. iOS 26에서는 미선택 아이콘·라벨 색도 시스템이 배경에 맞춰 정해 디자인 값(text-tertiary)이 적용되지 않았다. Figma의 하단 내비게이션은 웹·안드로이드 기준으로 보고, iOS는 시스템 기준을 따른다고 디자이너와 공유한다.
- 탭 WebView 4개가 처음에 함께 만들어져 메모리를 더 쓴다. 탭마다 웹 상태가 따로라 번치 전환·로그아웃 같은 변화를 다른 탭에 알리는 연결이 필요하다(미구현).
- expo-router를 처음 넣을 때 pnpm이 react-native를 두 벌 설치해 앱 시작이 실패했다. 잠금 파일을 되돌려 다시 풀자 한 벌로 돌아왔다. 의존성을 바꿀 때 확인하는 방법은 `docs/architecture/mobile-shell.md`의 "패키지 매니저 예외"에 있다.
- 탭 아이콘은 디자인 시스템 SVG를 1x·2x·3x PNG로 변환해 쉘에 둔다. 아이콘이 바뀌면 다시 변환해야 한다.

## 후속 결정

- 탭 화면에서 나오는 신호(`hidden: true`)를 웹 어디서 보낼지, 하위 경로에서 탭에 들어올 때 그 위치를 유지할지는 정하지 않았다(`docs/specs/bottom-navigation.md`의 확인할 항목). 첫 실제 탭 화면 전에 정한다.
- 탭 경로는 bridge schema와 쉘 양쪽에서 실제로 풀어 본 출처가 앱 출처일 때만 연다(`/\t/evil.test`처럼 URL 파서가 다른 출처로 읽는 경로 차단).

## 다시 검토할 조건

- 실기기에서 탭 WebView 여러 개의 메모리·시작 시간이 문제가 되면 탭을 처음 열 때 만드는 방식(lazy)이나 WebView 수를 줄이는 방식을 검토한다.
- 디자인이 알약 크기·간격을 iOS에서도 정확히 맞춰야 한다고 정하면 직접 만든 막대(011 방식)로 돌아갈지 다시 정한다.
- expo-router 네이티브 탭이 안정 API(SDK 58의 `expo-router/native-tabs`)가 되면 SDK를 올리면서 import 경로를 바꾼다.

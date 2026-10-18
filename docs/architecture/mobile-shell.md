# Mobile Shell

`apps/mobile-shell`은 `apps/web`(Next.js)을 그대로 보여주는 Expo 기반 네이티브 쉘이다. 화면을 직접 그리지 않고, `react-native-webview`로 배포된 웹 앱을 열고 카메라·공유·푸시 같은 네이티브 기능만 bridge로 보탠다.

## 왜 이 구조인가

- WebView가 실제 배포 주소를 그대로 열기 때문에 Next.js App Router의 RSC, Server Action, `apps/web`의 BFF(`docs/architecture/data-layer.md`)가 평소처럼 동작한다. 정적 export가 필요 없다.
- 완전 네이티브(화면마다 RN 컴포넌트로 재구현)보다 비용이 작다. 번치의 가장 차별화된 인터랙션(사진 드래그, 번들 룸 실시간 편집)은 WebView 한 겹을 거치면서 제스처 체감이 둔해질 수 있다는 점은 알려진 트레이드오프다. 다만 웹 구현에 따라 크게 달라지므로, 먼저 `docs/architecture/web-interface-guidelines.md`의 "Drag와 제스처" 기준으로 구현하고 실기기에서 확인한다. 그래도 기준에 못 미치는 화면이 나오면 해당 화면만 네이티브로 옮기는 걸 재검토한다.

## 소스 배치

진입점과 설정은 앱 루트에 두고, 런타임 코드와 테스트는 `src/`에 둔다. 기능별 파일은 같은 폴더에 모은다.

```text
apps/mobile-shell/
  App.tsx
  index.ts
  src/
    native-tab-bar/
      NativeTabBar.tsx
      useNativeTabBarGesture.ts
      native-tab-bar.ts
      native-tab-bar-store.ts
      native-tab-bar.test.mjs
    safe-area-script.ts
    safe-area-script.test.mjs
    sentry.ts
    sanitize-sentry-event.ts
    sanitize-sentry-event.test.mjs
```

네이티브 탭 막대의 UI·제스처·상태·좌표 계산과 테스트는 `src/native-tab-bar/`가 소유한다. 검증은 `apps/mobile-shell`에서 `pnpm test`와 `pnpm exec tsc --noEmit`으로 실행한다.

## WebView 기본 동작

`apps/mobile-shell/App.tsx`가 WebView에 다음 기본 동작을 건다.

- `http(s)`·`about:` 이동은 WebView 안에서 그대로 처리한다(소셜 로그인 redirect가 깨지지 않게 한다). `tel:`, `mailto:` 같은 다른 scheme은 WebView가 처리하지 못하므로 `Linking.openURL`로 OS에 넘긴다. 허용 출처 allowlist는 인증 흐름이 정해진 뒤에 추가한다.
- iOS는 `allowsBackForwardNavigationGestures`로 스와이프 뒤로가기를 허용하고, Android는 하드웨어 뒤로가기를 웹 history에 먼저 연결한다. 더 되돌릴 곳이 없으면 앱 기본 동작에 맡긴다.
- 로드에 실패하면 WebView의 빈 화면 대신 간단한 안내와 "다시 시도" 버튼을 보여준다. WebView 밖의 네이티브 UI는 이 오류 화면과 iOS 26 이상의 글라스 탭 막대다.

## Safe Area

Safe Area 여백(상하좌우)은 웹의 `AppFrame`(`apps/web/src/shared/components/layout/AppFrame.tsx`)이 CSS 변수 `--safe-area-top`·`-bottom`·`-left`·`-right`로 한 번만 적용한다. 변수는 `apps/web/src/app/globals.css`에 있고, 값은 `--native-safe-area-*`가 있으면 그 값을, 없으면 `env(safe-area-inset-*)`를 쓴다. 일반 브라우저와 네이티브 쉘이 같은 코드로 동작하고, 두 값이 겹쳐 더해지지 않는다. 루트 layout의 `viewport-fit=cover`가 있어야 iOS에서 `env()`가 실제 값을 돌려준다.

- 네이티브 쉘은 `react-native-safe-area-context`의 `useSafeAreaInsets()`로 측정한 값을 `src/safe-area-script.ts`의 `buildSafeAreaScript`로 `--native-safe-area-*`에 넣는다. 첫 로드는 `injectedJavaScriptBeforeContentLoaded`가, 이미 열린 페이지에서 값이 바뀌면 `injectJavaScript`가 맡는다.
- WebView의 `contentInsetAdjustmentBehavior`는 `"never"`로 둔다. 켜 두면 WebView가 자기 inset을 더해 같은 여백이 두 번 들어간다. 이 prop은 iOS 전용이라 Android에서는 적용되지 않으며, Android는 실기기로 따로 확인한다.
- 화면 컴포넌트(`PageShell`, 각 화면)는 Safe Area 여백을 다시 더하지 않는다.
- 앱은 `app.json`의 `orientation: "portrait"`로 세로에 고정되어 있어, iPhone 기준으로 앱 안에서는 가로 모드가 생기지 않는다(`ios.supportsTablet: true`인 iPad에서도 세로로 고정되는지는 확인하지 못했다). 일반 브라우저의 가로 모드를 위해 좌우 Safe Area를 적용하고, `PageShell`의 본문은 최소 높이(8rem)를 가진다. header·bottom·Safe Area를 뺀 높이가 그보다 작으면 본문 대신 틀 전체가 넘쳐 페이지가 스크롤된다. 이때 하단 영역(CTA)은 문서를 스크롤해야 보이고, main 위에서 스크롤하면 `overscroll-y-contain` 때문에 문서로 이어지지 않아 닿기 어려울 수 있다. 하단을 항상 보이게 하는 sticky 방식과 문서 스크롤 하나로 통일하는 방식은 이득이 불분명하거나 범위가 커서 택하지 않았고, 이 한계는 실기기와 낮은 화면에서 확인한 뒤 다시 정한다.
- 확인한 것: 브라우저에서 네이티브 값이 한 번만 적용되고 가로 모드·낮은 화면의 최소 높이 정책이 동작하는 것, 네이티브의 TypeScript 검사·iOS JS 번들 생성·값 변환 테스트. 확인하지 못한 것: iOS·Android 실기기와 시뮬레이터에서 실제 값이 들어가는지, 마운트 뒤 값이 바뀐 상태에서 새 문서를 로드할 때 `injectedJavaScriptBeforeContentLoaded`의 새 값이 쓰이는지, Android 시스템 바(edge-to-edge) 처리, 소프트 키보드와 `dvh`. 이 부분은 실기기 확인 전까지 통과로 보지 않는다.

앱 식별자(iOS `bundleIdentifier`, Android `package`)는 아직 없다. 실기기 확인과 출시 준비 시점에 정한다.

## 권한과 출시 전 확인

아직 구현 전이다. 다른 프로젝트의 App Store 심사 경험(UGC 신고·차단 미구현으로 1.2 거절)에서 가져온 확인 목록이며, `docs/specs/bunch-prd.md`의 앱 심사 항목과 함께 본다.

- iOS는 권한 팝업을 한 번 거절하면 앱에서 다시 띄울 수 없다. `denied` 상태는 팝업 재요청이 아니라 설정 화면 안내로 처리한다.
- 사진·카메라·알림 권한의 사용 목적 문구(`Info.plist`의 `NS*UsageDescription` 등)는 사용자가 읽는 한국어로 적고, 실제 사용 목적과 어긋나지 않게 한다. 위치 권한은 받지 않는다(촬영 위치는 사진의 EXIF에서만 읽는다, PRD 8장).
- 출시 대상은 iOS 앱뿐이다(PRD 8장). 다만 Android로 넓힐 수 있게 만든다. 플랫폼 분기는 쉘의 얇은 계층에 가두고, 웹은 iOS에서만 되는 API나 스타일을 전제로 쓰지 않는다. Android 전용 처리(하드웨어 뒤로가기 등)는 유지하되, Android 실기기 검증은 출시 범위가 아니다.
- 심사 전에 개인정보 처리방침의 공개 URL, 계정 삭제, 신고·차단, 부적절한 콘텐츠 삭제 정책이 갖춰졌는지 확인한다.
- 서명 키와 keystore 파일은 저장소에 두지 않고 `.gitignore`에 포함한다.

## 패키지 매니저 예외

`apps/mobile-shell`만 **pnpm**을 쓴다. Expo/Metro가 Yarn PnP를 지원하지 않기 때문이다. 배경과 재검토 조건은 `docs/decisions/records/003-mobile-shell-pnpm-exception.md`를 확인한다.

- root `package.json`의 `workspaces`에서 `apps/mobile-shell`을 명시적으로 제외한다. Yarn install·workspace 명령의 대상이 아니다.
- 루트 `.yarnrc.yml`의 `pnpIgnorePatterns`도 `./apps/mobile-shell/**`를 제외한다. VS Code가 루트 Yarn TypeScript SDK를 사용해도 이 폴더의 의존성은 자체 `node_modules`에서 찾는다. 설정 변경 후에는 TypeScript 서버를 재시작한다.
- 의존성 설치·관리는 `apps/mobile-shell` 안에서 `pnpm install`로 따로 한다.
- 네이티브 모듈 추가는 `pnpm add`가 아니라 `npx expo install <package>`를 쓴다 — 설치된 Expo SDK와 호환되는 버전을 Expo가 직접 고른다.

## 네이티브 글라스 탭 막대 (iOS 26 이상)

쉘은 화면을 직접 그리지 않지만 iOS 26 이상에서는 하단 탭 막대 하나를 WebView 위에 네이티브 `GlassView`(`expo-glass-effect`)로 그린다. 근거와 대안은 `docs/decisions/records/011-bottom-navigation-glass-by-platform.md`다.

- 막대는 `src/native-tab-bar/NativeTabBar.tsx`가 그린다. 항목 라벨·아이콘(SF Symbol 이름)·선택은 웹이 `setNativeTabBar`로 정하고, 쉘은 그리기와 눌림 전달만 한다. 항목 ID는 서로 달라야 하며 중복이면 요청 검증에서 거부한다.
- 쉘은 iOS이고 `isLiquidGlassAvailable()`이 true일 때만 `setNativeTabBar`가 true를 돌려준다. 웹 탭 조합은 true일 때 자기 `BottomNavigation`을 숨기고, false(브라우저·안드로이드·iOS 26 미만)이면 계속 쓰도록 구현해야 한다. 웹 호출부는 아직 미구현이다.
- 탭을 누르면 쉘이 `postMessage('nativeTabPress', { id })`로 웹에 알린다. 웹이 해당 탭 화면으로 이동한다.
- WebView는 막대 뒤까지 그려져야 글라스 효과가 보인다. 막대가 차지하는 높이는 CSS 변수 `--native-tab-bar-inset`으로 웹에 주입한다(막대가 없으면 0). 웹 탭 조합은 본문 아래 여백에 이 값을 더해야 한다. 현재 웹에는 이 변수의 소비 코드가 없다. 새 문서를 로드하면 막대 상태를 비우므로 웹이 다시 정해야 한다.
- 선택 알약은 웹 막대와 같이 항목 사이를 200ms로 미끄러진다(`Animated`, 처음 배치와 모션 감소 설정에서는 즉시 이동). 실행 중 모션 감소 설정이 켜지면 진행 중인 애니메이션을 멈추고, 선택 위치·기본 크기·활성 표시를 즉시 맞춘다. 끌기 종료·취소의 복귀에도 같은 설정을 적용한다.
- 웹 막대와 같은 동작을 낸다. 탭, 누른 채 끌어서 손을 뗀 탭 선택(6px 이상 움직이면 끌기), 끄는 동안 알약이 도착한 항목의 아이콘이 활성으로 바뀜, 알약을 누르는 동안 1.12배로 커졌다가 놓으면 0.95배를 거쳐 돌아옴(탭 이동 때도 같은 모션). 막대 전체를 `PanResponder`가 받고 보조 기술은 항목의 `onAccessibilityTap`으로 선택한다. 좌표·여백 계산 단위 테스트, 타입 검사와 iOS JS 번들 생성을 확인했고 iPhone에서 실제 터치(끌기·모션·VoiceOver)는 확인하지 못했다.
- 막대 위치(홈 인디케이터 위 여백)는 실기기에서 맞춰 보지 않은 추정값이다. 쉘 앱으로 iPhone에서 눌림·VoiceOver·스크롤 성능을 확인하지 못했다. 막대 모양은 별도 실험 앱으로만 확인했다.
- 안드로이드에서는 `GlassView`가 일반 View로 떨어지므로 쓰지 않는다.
- 스타일은 `StyleSheet`를 쓰고, 색·크기는 디자인 시스템 토큰 값을 상수로 옮겨 이름과 출처를 주석에 남긴다(RN은 CSS 변수를 못 쓴다). NativeWind는 쓰지 않는다. Tailwind v4용 v5가 아직 정식이 아니고(preview, `react-native-css` nightly 필요) Expo SDK 57·React Native 0.86과의 호환을 확인하지 못했으며, 쉘의 네이티브 UI가 막대 하나뿐이라 도구를 더할 이득이 작다. 쉘에 네이티브 화면이 늘고 정식 v5가 나오면 결정 기록과 함께 다시 검토한다.

## Bridge 계약 (`packages/bridge`)

`packages/bridge`는 web↔native 호출의 타입 계약만 담는다. 런타임 구현은 두지 않는다.

```text
packages/bridge/
  src/schema.ts   각 메서드의 zod schema (요청 검증)
  src/index.ts    AppBridgeMethods(메서드 시그니처), AppBridge(bridge()/linkBridge()가 요구하는 store 타입)
```

- `AppBridge`는 평범한 메서드 객체가 아니라 `BridgeStore<AppBridgeMethods>`(zustand 스타일 store)다. `@webview-bridge`의 `bridge()`/`linkBridge()`가 이 shape를 요구하기 때문이다 — `AppBridgeMethods`를 직접 넘기면 index signature 타입 에러가 난다.
- `packages/bridge`는 Yarn workspace 멤버다. `apps/web`은 평소처럼 `@app/bridge`를 import한다.
- `apps/mobile-shell`은 Yarn workspace 밖에 있어 `"@app/bridge": "file:../../packages/bridge"`로 참조한다. `packages/bridge`를 수정하면 `apps/mobile-shell`에서 `pnpm install`을 다시 실행해야 반영된다.

### 네이티브 쪽 구현 (`apps/mobile-shell/App.tsx`)

실제 구현은 [App.tsx](../../apps/mobile-shell/App.tsx)를 따른다. `createWebView`는 `appPostMessageSchema`로 네이티브 탭 선택 이벤트를 연결한다.

`bridge()`에는 **인라인 객체 리터럴**을 넘긴다. 미리 `AppBridgeMethods` 타입을 선언한 변수를 넘기면 TypeScript가 index signature 불일치로 거부한다(이름 있는 타입은 fresh literal 취급을 받지 못한다).

### 웹 쪽 호출 (`apps/web/src/shared/bridge/client.ts`)

실제 구현은 [bridge client](../../apps/web/src/shared/bridge/client.ts)를 따른다. `linkBridge<AppBridge, AppPostMessageSchema>`로 메서드와 이벤트 계약을 함께 지정한다.

`initialBridge`는 WebView 밖(일반 브라우저)에서 실행될 때의 폴백이다. `isWebViewBridgeAvailable`로 지금 네이티브 쉘 안인지 확인할 수 있다.

## 새 bridge 메서드를 추가하려면

1. `packages/bridge/src/schema.ts`에 zod schema를 추가한다.
2. `packages/bridge/src/index.ts`의 `AppBridgeMethods`에 메서드 시그니처를 추가한다.
3. `apps/mobile-shell/App.tsx`의 `bridge({...})`에 실제 네이티브 구현을 추가한다.
4. `apps/web`의 bridge client에 `initialBridge` 폴백을 추가한다(웹 전용 대체 동작이 있다면).
5. 양쪽에서 typecheck를 돌려 계약이 어긋나지 않는지 확인한다(`yarn workspace @app/bridge typecheck`, `apps/mobile-shell`에서 `pnpm exec tsc --noEmit`).

## 인증 — 아직 설계 전

지금 `apps/web`의 BFF는 httpOnly 쿠키에만 의존한다(`docs/architecture/data-layer.md`). WebView는 쿠키 지속성이 불안정할 수 있어, 실제로 로그인 흐름을 이 쉘에 연결하기 전에 쿠키 유실 대응 설계가 필요하다. 참고할 만한 패턴이 있으면 `.agents/notes/`를 먼저 확인한다 — 이 저장소의 확정된 결정이 아니라 리서치 메모이므로, 실제로 적용하기로 결정하면 이 문서와 `data-layer.md`를 함께 갱신한다.

## 오류 모니터링

- 네이티브 쉘은 `@sentry/react-native`로 조직 `bunch-01`의 `bunch-mobile` 프로젝트에 오류를 보낸다. WebView 안의 웹 오류는 기존 웹 Sentry 프로젝트가 수집한다.
- `index.ts`에서 앱을 읽기 전에 SDK를 초기화하고, `App`을 `Sentry.wrap`으로 감싼다. 개발 모드에서는 전송을 끄며, 배포 빌드와 `EXPO_PUBLIC_SENTRY_DSN`이 있을 때만 수집한다.
- `apps/mobile-shell/.env.local`에 `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_SENTRY_DSN`을 설정한다. 소스맵·네이티브 심볼 업로드용 `SENTRY_AUTH_TOKEN`은 빌드 전용 비밀값이며 `EXPO_PUBLIC_` 접두사를 붙이지 않는다. EAS 빌드에는 별도로 비밀 환경변수를 설정해야 한다.
- `metro.config.js`는 Sentry Debug ID를 번들·소스맵에 추가하고, `app.json`의 Sentry Expo config plugin은 네이티브 빌드 업로드를 구성한다. `ios/`, `android/` 생성물은 저장소에 추가하지 않는다.
- 성능 추적·Replay·로그·세션 추적과 breadcrumb를 끈다. JavaScript 이벤트는 사용자·요청·부가 정보를 제거하고 오류 설명·타입·스택을 남긴다. 오류 설명의 URL·이메일·토큰·비밀번호·한국 휴대전화 패턴은 웹과 동일하게 마스킹한다. 패턴 밖 개인정보를 탐지하지 못하므로 오류 메시지에 사용자 원문을 넣지 않는다. **네이티브 크래시는 JavaScript `beforeSend`를 거치지 않는다.** 네이티브 이벤트의 전체 개인정보 제거를 보장하지 않으며 출시 전에 Sentry 서버 측 데이터 정제와 실제 크래시 내용을 점검한다.
- Expo Go에서는 네이티브 크래시 수집을 검증할 수 없다. config plugin 적용 후 개발/배포용 네이티브 앱을 다시 빌드해야 한다. 현재 전송 조건에서는 배포 모드 빌드로 수신을 확인한다.
- 설치와 설정은 [Sentry Expo 가이드](https://docs.sentry.io/platforms/react-native/guides/expo/), 네이티브 정제 한계는 [이벤트 필터링 문서](https://docs.sentry.io/platforms/react-native/configuration/filtering/)를 참고한다.

## 검증 명령

- `apps/mobile-shell`: `pnpm exec tsc --noEmit`, `npx expo lint`
- Sentry JavaScript 이벤트 정제: `apps/mobile-shell`에서 `pnpm test`
- `packages/bridge`: `yarn workspace @app/bridge typecheck`, `lint`
- WebView가 가리키는 주소는 `EXPO_PUBLIC_WEB_URL` 환경변수로 관리한다. `apps/mobile-shell/.env.example`을 확인한다.

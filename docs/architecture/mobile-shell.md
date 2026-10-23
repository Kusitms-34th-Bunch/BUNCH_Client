# Mobile Shell

`apps/mobile-shell`은 `apps/web`(Next.js)을 그대로 보여주는 Expo 기반 네이티브 쉘이다. 화면을 직접 그리지 않고, `react-native-webview`로 배포된 웹 앱을 열고 카메라·공유·푸시 같은 네이티브 기능만 bridge로 보탠다.

## 왜 이 구조인가

- WebView가 실제 배포 주소를 그대로 열기 때문에 Next.js App Router의 RSC, Server Action, `apps/web`의 BFF(`docs/architecture/api-boundary.md`)가 평소처럼 동작한다. 정적 export가 필요 없다.
- 완전 네이티브(화면마다 RN 컴포넌트로 재구현)보다 비용이 작다. 번치의 가장 차별화된 인터랙션(사진 드래그, 번들 룸 실시간 편집)은 WebView 한 겹을 거치면서 제스처 체감이 둔해질 수 있다는 점은 알려진 트레이드오프다. 다만 웹 구현에 따라 크게 달라지므로, 먼저 `docs/architecture/web-interface-guidelines.md`의 "Drag와 제스처" 기준으로 구현하고 실기기에서 확인한다. 그래도 기준에 못 미치는 화면이 나오면 해당 화면만 네이티브로 옮기는 걸 재검토한다.

## 소스 배치

진입점과 설정은 앱 루트에, 화면 route는 `app/`(expo-router)에, 런타임 코드와 테스트는 `src/`에 둔다. 기능별 파일은 같은 폴더에 모은다.

```text
apps/mobile-shell/
  index.ts              Sentry 초기화 후 expo-router/entry
  app/
    _layout.tsx         SafeAreaProvider, Stack(헤더 없음)
    index.tsx           첫 화면: WebView 하나(로그인·온보딩)
    (tabs)/
      _layout.tsx       iOS 시스템 탭 바(NativeTabs)
      feed.tsx photos.tsx bunch.tsx my.tsx   탭마다 WebView
  assets/
    tab-icons/          탭 아이콘(디자인 시스템 SVG → PNG 1x·2x·3x)
    fonts/              Pretendard Regular(탭 라벨), 라이선스
  src/
    web-view/AppWebView.tsx   bridge 구현과 공통 WebView(출처 제한·Safe Area·뒤로가기·오류 화면)
    tabs/                     탭 ID·경로 판정(tabs.ts), 아이콘(tab-icons.ts), 저장소, 탭 화면(TabScreen.tsx)
    safe-area-script.ts, sentry.ts, sanitize-sentry-event.ts, web-url.ts, gallery-image.ts, permissions.ts (+ *.test.mjs)
```

검증은 `apps/mobile-shell`에서 `pnpm test`와 `pnpm exec tsc --noEmit`으로 실행한다.

## WebView 기본 동작

`src/web-view/AppWebView.tsx`가 쉘의 모든 WebView(첫 화면, 탭마다 하나)에 다음 기본 동작을 건다.

- 설정한 웹 주소와 같은 origin(프로토콜·호스트·포트)의 이동만 WebView 안에서 처리한다. 외부 주소와 `tel:`, `mailto:` 등은 `Linking.openURL`로 OS에 넘긴다. 인증 redirect는 별도 계약 확정 후 연결한다.
- iOS는 `allowsBackForwardNavigationGestures`로 스와이프 뒤로가기를 허용하고, Android는 하드웨어 뒤로가기를 웹 history에 먼저 연결한다. 더 되돌릴 곳이 없으면 앱 기본 동작에 맡긴다.
- 로드에 실패하면 WebView의 빈 화면 대신 간단한 안내와 "다시 시도" 버튼을 보여준다. WebView 밖의 네이티브 UI는 이 오류 화면과 iOS 시스템 탭 바다.

iOS 입력 포커스 확대는 디자인 시스템의 `TextField`·`LabeledTextArea`에서 대응한다. 실제 글꼴을 16px로 렌더링하고 0.875배 축소해 14px 디자인을 유지한다. 입력 폭·행 높이·padding과 textarea 자동 높이도 같은 비율로 보정한다. `@supports (-webkit-touch-callout: none)`으로 iOS WebKit에 적용하며 모바일 Safari도 포함한다. 쉘에서 viewport 확대 제한을 주입하지 않는다. 실제 터치·키보드·커서·텍스트 선택·줄바꿈은 시뮬레이터와 실기기 검증이 필요하다.

## Safe Area

Safe Area 여백(상하좌우)은 웹의 `AppFrame`(`apps/web/src/shared/components/layout/AppFrame.tsx`)이 CSS 변수 `--safe-area-top`·`-bottom`·`-left`·`-right`로 한 번만 적용한다. 변수는 `apps/web/src/app/globals.css`에 있고, 값은 `--native-safe-area-*`가 있으면 그 값을, 없으면 `env(safe-area-inset-*)`를 쓴다. 일반 브라우저와 네이티브 쉘이 같은 코드로 동작하고, 두 값이 겹쳐 더해지지 않는다. 루트 layout의 `viewport-fit=cover`가 있어야 iOS에서 `env()`가 실제 값을 돌려준다.

- 네이티브 쉘은 `react-native-safe-area-context`의 `useSafeAreaInsets()`로 측정한 값을 `src/safe-area-script.ts`의 `buildSafeAreaScript`로 `--native-safe-area-*`에 넣는다. 첫 로드는 `injectedJavaScriptBeforeContentLoaded`가, 이미 열린 페이지에서 값이 바뀌면 `injectJavaScript`가 맡는다.
- 첫 로드의 주입은 hydration 전에 `<html>`의 `style`을 변경한다. 서버가 알 수 없는 기기별 값이므로 웹 루트 layout의 `<html>`에만 `suppressHydrationWarning`을 적용한다. 하위 화면의 hydration 경고는 억제하지 않는다.
- WebView의 `contentInsetAdjustmentBehavior`는 `"never"`로 둔다. 켜 두면 WebView가 자기 inset을 더해 같은 여백이 두 번 들어간다. 이 prop은 iOS 전용이라 Android에서는 적용되지 않으며, Android는 실기기로 따로 확인한다.
- 화면 컴포넌트(`PageShell`, 각 화면)는 Safe Area 여백을 다시 더하지 않는다.
- 초대장처럼 Safe Area까지 배경이 이어지는 화면은 route에 `data-app-background="brand-subtle-1"`을 지정한다. `AppFrame`이 CSS `:has()`로 같은 배경을 칠하며 여백 크기는 바꾸지 않는다. 로티 화면은 배경 전환이 시작될 때 같은 표식을 `PageShell`에 전달해 본문과 Safe Area를 함께 300ms ease-out으로 전환한다. 동작 줄이기에서는 배경 전환 효과를 끈다. 화면이 제거되면 배경도 해제된다.
- 앱은 `app.json`의 `orientation: "portrait"`로 세로에 고정되어 있어, iPhone 기준으로 앱 안에서는 가로 모드가 생기지 않는다(`ios.supportsTablet: true`인 iPad에서도 세로로 고정되는지는 확인하지 못했다). 일반 브라우저의 가로 모드를 위해 좌우 Safe Area를 적용하고, `PageShell`의 본문은 최소 높이(8rem)를 가진다. header·bottom·Safe Area를 뺀 높이가 그보다 작으면 본문 대신 틀 전체가 넘쳐 페이지가 스크롤된다. 이때 하단 영역(CTA)은 문서를 스크롤해야 보이고, main 위에서 스크롤하면 `overscroll-y-contain` 때문에 문서로 이어지지 않아 닿기 어려울 수 있다. 하단을 항상 보이게 하는 sticky 방식과 문서 스크롤 하나로 통일하는 방식은 이득이 불분명하거나 범위가 커서 택하지 않았고, 이 한계는 실기기와 낮은 화면에서 확인한 뒤 다시 정한다.
- 확인한 것: 브라우저에서 네이티브 값이 한 번만 적용되고 가로 모드·낮은 화면의 최소 높이 정책이 동작하는 것, 네이티브의 TypeScript 검사·iOS JS 번들 생성·값 변환 테스트. 확인하지 못한 것: iOS·Android 실기기와 시뮬레이터에서 실제 값이 들어가는지, 마운트 뒤 값이 바뀐 상태에서 새 문서를 로드할 때 `injectedJavaScriptBeforeContentLoaded`의 새 값이 쓰이는지, Android 시스템 바(edge-to-edge) 처리, 소프트 키보드와 `dvh`. 이 부분은 실기기 확인 전까지 통과로 보지 않는다.

현재 iOS `bundleIdentifier`는 `com.kyeongjooni.mobile-shell`이고 Android `package`는 아직 없다. 출시용 식별자는 스토어 등록 전에 확정한다.

## 실행과 테스트

시뮬레이터·실기기의 최초 설치, 다음 실행, Expo Go·개발 앱 구분, Xcode·EAS 빌드와 확인 항목은
[모바일 앱 실행과 테스트](../workflows/mobile-testing.md)를 따른다.
실행 절차는 해당 문서에서 관리하며, 이 문서는 구조와 런타임 계약을 다룬다.

## 권한과 출시 전 확인

가입 때 사진·카메라·알림 권한을 요청하는 `requestPermission`(bridge, `src/permissions.ts`)만 구현했다(약관 화면의 시작하기가 사진 → 카메라 → 알림 순서로 호출, 허용·거부와 무관하게 다음으로 진행). 사진·카메라는 `expo-image-picker`, 알림은 `expo-notifications`로 요청하며 상태는 `granted`·`denied`(다시 물을 수 없음)·`undetermined`로 돌려준다. 사용 목적 문구는 `app.json`의 `expo-image-picker` 플러그인에 Figma Alert 문구로 넣었다. 새 네이티브 모듈이라 개발 앱·EAS 빌드는 다시 만들어야 하고, 실기기에서 팝업은 확인하지 못했다. 나머지 항목은 아직 구현 전이다. 다른 프로젝트의 App Store 심사 경험(UGC 신고·차단 미구현으로 1.2 거절)에서 가져온 확인 목록이며, 내부 기획 문서의 앱 심사 항목과 함께 본다.

- iOS는 권한 팝업을 한 번 거절하면 앱에서 다시 띄울 수 없다. `denied` 상태는 팝업 재요청이 아니라 설정 화면 안내로 처리한다.
- 사진·카메라·알림 권한의 사용 목적 문구(`Info.plist`의 `NS*UsageDescription` 등)는 사용자가 읽는 한국어로 적고, 실제 사용 목적과 어긋나지 않게 한다. 위치 권한은 받지 않고 사진의 위치 정보도 쓰지 않는다. 업로드 전에 앱이 촬영 날짜·시간만 뽑고 GPS를 포함한 위치 메타데이터를 모두 지운다(서버가 받은 뒤 지우면 위치가 서버로 간 것이 된다, 내부 기획 문서).
- 출시 대상은 iOS 앱뿐이다(내부 기획 문서). 다만 Android로 넓힐 수 있게 만든다. 플랫폼 분기는 쉘의 얇은 계층에 가두고, 웹은 iOS에서만 되는 API나 스타일을 전제로 쓰지 않는다. Android 전용 처리(하드웨어 뒤로가기 등)는 유지하되, Android 실기기 검증은 출시 범위가 아니다.
- 심사 전에 개인정보 처리방침의 공개 URL, 계정 삭제, 신고·차단, 부적절한 콘텐츠 삭제 정책이 갖춰졌는지 확인한다.
- 서명 키와 keystore 파일은 저장소에 두지 않고 `.gitignore`에 포함한다.

## 패키지 매니저 예외

`apps/mobile-shell`만 **pnpm**을 쓴다. Expo/Metro가 Yarn PnP를 지원하지 않기 때문이다. 배경과 재검토 조건은 `docs/decisions/records/003-mobile-shell-pnpm-exception.md`를 확인한다.

- root `package.json`의 `workspaces`에서 `apps/mobile-shell`을 명시적으로 제외한다. Yarn install·workspace 명령의 대상이 아니다.
- 루트 `.yarnrc.yml`의 `pnpIgnorePatterns`도 `./apps/mobile-shell/**`를 제외한다. VS Code가 루트 Yarn TypeScript SDK를 사용해도 이 폴더의 의존성은 자체 `node_modules`에서 찾는다. 설정 변경 후에는 TypeScript 서버를 재시작한다.
- 의존성 설치·관리는 `apps/mobile-shell` 안에서 `pnpm install`로 따로 한다.
- 네이티브 모듈 추가는 `pnpm exec expo install <package> --pnpm`을 쓴다. 설치된 Expo SDK와 호환되는 버전을 Expo가 직접 고른다.
- pnpm은 react-native를 peer 조합마다 따로 설치할 수 있다. 두 벌이 번들에 들어가면 앱 시작이 `"main" has not been registered`로 멈춘다. expo-router를 처음 넣을 때 기존 잠금 파일에 증분으로 설치하면서 이 상태가 생겼고, 잠금 파일을 되돌린 뒤 한 번에 다시 풀자 한 벌로 돌아왔다(정확한 해석 차이는 특정하지 못함). 의존성을 바꾼 뒤에는 `ls node_modules/.pnpm | grep '^react-native@'`로 한 벌인지 확인한다.
- pnpm 11의 최소 공개 기간 정책(공개 후 하루가 지나야 설치)을 예외 없이 지킨다. `expo install`이 갓 나온 패치를 고르면서 `pnpm-workspace.yaml`에 `minimumReleaseAgeExclude`를 자동으로 넣을 수 있으니, 넣었다면 지우고 정책을 통과하는 패치로 범위를 맞춘다(예: `expo-router` `~57.0.28`).

## iOS 시스템 탭 바

쉘은 화면을 직접 그리지 않지만 iOS에서는 하단 탭을 시스템 탭 바(UITabBar)로 그린다. iOS 26 이상은 시스템이 Liquid Glass로 그리고 끌어서 이동·렌즈 효과도 시스템 동작이다. 근거와 대안은 `docs/decisions/records/012-ios-system-tab-bar.md`다(011의 직접 만든 `GlassView` 막대를 대체).

- 구조: 첫 화면(`app/index.tsx`)은 WebView 하나다. 웹 탭 화면(`apps/web`의 `features/main-navigation/components/MainTabBar.tsx`)이 `setNativeTabBar({ items, selectedId })`를 부르면 쉘이 `(tabs)`로 바꾸고, 탭마다 WebView가 항목의 `path`를 연다. 이미 탭 화면이면 같은 요청은 화면을 옮기지 않는다. `hidden: true`면 하나의 WebView로 돌아간다.
- 탭 화면 파일은 `app/(tabs)/`의 `feed`·`photos`·`bunch`·`my` 4개로 고정이다(`src/tabs/tabs.ts`의 `TAB_IDS`). 웹이 이 밖의 ID를 보내면 `setNativeTabBar`가 false를 돌려 웹 막대를 쓴다. 항목이 없는 탭은 숨긴다.
- 탭 라벨·경로는 웹이 정하고, 아이콘은 쉘이 탭 ID로 정한다. 아이콘은 웹 막대와 같은 디자인 시스템 Line·Fill 아이콘(Large 24px) SVG를 1x·2x·3x PNG로 옮긴 것이다(`assets/tab-icons/`, template으로 시스템이 색을 칠함). 디자인 시스템 아이콘이 바뀌면 다시 변환한다.
- 선택 색은 text-primary(#121212), 라벨은 Pretendard Regular 12pt다(`app/(tabs)/_layout.tsx`). 미선택 색 text-tertiary(#535a61)도 지정했지만 iOS 26 Liquid Glass 탭 바는 배경에 맞춰 시스템이 정해 적용되지 않았다. 알약 크기·막대 높이·간격은 시스템이 정한다. `itemPositioning`·`itemWidth` 실험에서 iOS 26 알약 폭이 바뀌지 않았다.
- 쉘은 iOS일 때만 `setNativeTabBar`에 true를 돌려준다. 브라우저·안드로이드는 false라 웹 `BottomNavigation`을 쓴다. 웹 막대는 응답 전에는 그리지 않아 쉘에서 잠깐 보였다 사라지지 않는다.
- 탭 화면 아래 여백: 탭 안의 `SafeAreaProvider`가 탭 바 높이를 포함한 아래 Safe Area를 재서 웹에 넘긴다. 그래서 웹 본문은 탭 바 위에서 끝나고 탭 바 뒤로 내용이 비치지는 않는다. 내용을 탭 바 뒤까지 펼치려면 웹이 아래 여백을 본문 안 여백으로 바꿔야 한다(미구현).
- 탭 WebView 4개는 처음에 함께 만들어진다(expo-router 네이티브 탭은 모든 탭을 미리 그림). 탭마다 웹 상태가 따로라 번치 전환·로그아웃처럼 다른 탭에도 알려야 하는 변화는 아직 연결하지 않았다.
- 확인한 것: iOS 시뮬레이터(iPhone 17 Pro, iOS 26.5)에서 첫 화면 → 탭 화면 전환, 탭 이동, 아이콘·선택 색·라벨 크기. 확인하지 못한 것: 실기기, 끌어서 이동·렌즈 효과의 실제 터치, VoiceOver, 탭 사이 로그인 쿠키 공유, 메모리, `hidden: true`로 돌아가기, 안드로이드에서 탭 WebView 여러 개의 뒤로가기 처리.

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

### 네이티브 쪽 구현 (`apps/mobile-shell/src/web-view/AppWebView.tsx`)

실제 구현은 [AppWebView.tsx](../../apps/mobile-shell/src/web-view/AppWebView.tsx)를 따른다. `createWebView`는 `appPostMessageSchema`를 받는다. 네이티브 → 웹 이벤트는 지금 없다(탭 선택은 시스템 탭 바가 처리해 `nativeTabPress`를 지웠다). 여러 WebView가 같은 bridge를 쓴다.

`bridge()`에는 **인라인 객체 리터럴**을 넘긴다. 미리 `AppBridgeMethods` 타입을 선언한 변수를 넘기면 TypeScript가 index signature 불일치로 거부한다(이름 있는 타입은 fresh literal 취급을 받지 못한다).

### 웹 쪽 호출 (`apps/web/src/shared/bridge/client.ts`)

실제 구현은 [bridge client](../../apps/web/src/shared/bridge/client.ts)를 따른다. `linkBridge<AppBridge, AppPostMessageSchema>`로 메서드와 이벤트 계약을 함께 지정한다.

`initialBridge`는 WebView 밖(일반 브라우저)에서 실행될 때의 폴백이다. `isWebViewBridgeAvailable`로 지금 네이티브 쉘 안인지 확인할 수 있다.

## 새 bridge 메서드를 추가하려면

1. `packages/bridge/src/schema.ts`에 zod schema를 추가한다.
2. `packages/bridge/src/index.ts`의 `AppBridgeMethods`에 메서드 시그니처를 추가한다.
3. `apps/mobile-shell/src/web-view/AppWebView.tsx`의 `bridge({...})`에 실제 네이티브 구현을 추가한다.
4. `apps/web`의 bridge client에 `initialBridge` 폴백을 추가한다(웹 전용 대체 동작이 있다면).
5. 양쪽에서 typecheck를 돌려 계약이 어긋나지 않는지 확인한다(`yarn workspace @app/bridge typecheck`, `apps/mobile-shell`에서 `pnpm exec tsc --noEmit`).

## 갤러리 사진 선택

- `pickGalleryImage(): Promise<GalleryImage | null>`은 `expo-image-picker`로 사진 한 장을 선택한다. 촬영은 제공하지 않는다. 취소는 `null`, 읽기·크기 제한 실패는 reject이며 웹은 기존 사진을 유지한다.
- SDK 57 호환 버전은 `expo install`로 설치한다. 사진 전용 시스템 선택기는 전체 앨범 권한을 먼저 요청하지 않는다. 앱 권한 설명은 `app.json`에서 관리하며 카메라·마이크 권한은 추가하지 않는다. [Expo ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)를 기준으로 한다.
- `src/gallery-image.ts`에서 시스템 정사각형 편집 후 JPEG base64를 반환한다. 네이티브 `file://` 경로는 웹에서 직접 읽지 않는다. 브리지 응답은 `galleryImageSchema`로 data URL 형식과 약 4MiB 전송 상한을 검증한다.
- 현재는 번치 생성 완료 화면의 임시 미리보기다. 이미지·생성 API 확정 후 업로드 결과 ID/URL로 저장 계약을 연결한다. `exif: false`만으로 파일 메타데이터 제거를 보장하지 않으며 업로드 단계에서 별도 확정한다.
- 웹 개발 fallback은 파일 input(JPEG·PNG·WebP, 최대 3MiB)으로 선택하고 브라우저 디코딩 성공 후 표시한다. 네이티브 편집 UI·HEIC 지원을 대체하지 않는다. 사진을 영구 저장하거나 localStorage에 남기지 않는다.
- WebView 내부 이동은 설정한 웹 주소와 같은 origin(프로토콜·호스트·포트)만 허용하고 외부 주소는 OS로 전달한다. 외부 페이지가 갤러리 등 네이티브 브리지에 접근하지 못하도록 하는 경계다. 인증 redirect는 별도 계약 확정 후 연결한다.
- 모듈·config plugin 추가 후 기존 개발 앱은 prebuild와 재빌드가 필요하다. 이전 쉘에서 이 메서드를 지원하지 않으면 웹에 업데이트 안내를 표시한다. 웹 fallback 여부는 `isNativeShell()`의 `window.ReactNativeWebView` 존재 여부로 구분한다(`isWebViewBridgeAvailable`은 initialBridge 메서드도 포함). 사용자가 선택을 마칠 때까지 기다리도록 전용 `galleryBridge`의 timeout만 끄고 갤러리 오류는 reject로 전달한다. 기존 `appBridge`의 대기 정책은 유지한다. 실제 iPhone 갤러리·취소·오류·편집 동작은 별도 검증한다.

## 인증 — 아직 설계 전

지금 `apps/web`의 BFF는 httpOnly 쿠키에만 의존한다(`docs/architecture/api-boundary.md`). WebView는 쿠키 지속성이 불안정할 수 있어, 실제로 로그인 흐름을 이 쉘에 연결하기 전에 쿠키 유실 대응 설계가 필요하다. 참고할 만한 패턴이 있으면 `.agents/notes/`를 먼저 확인한다 — 이 저장소의 확정된 결정이 아니라 리서치 메모이므로, 실제로 적용하기로 결정하면 이 문서와 `api-boundary.md`를 함께 갱신한다.

## 오류 모니터링

- 네이티브 쉘은 `@sentry/react-native`로 조직 `bunch-01`의 `bunch-mobile` 프로젝트에 오류를 보낸다. WebView 안의 웹 오류는 기존 웹 Sentry 프로젝트가 수집한다.
- `index.ts`에서 앱을 읽기 전에 SDK를 초기화하고, `App`을 `Sentry.wrap`으로 감싼다. 개발 모드에서는 전송을 끄며, 배포 빌드와 `EXPO_PUBLIC_SENTRY_DSN`이 있을 때만 수집한다.
- `apps/mobile-shell/.env.local`에 `EXPO_PUBLIC_DEV_WEB_URL`(개발), `EXPO_PUBLIC_WEB_URL`(Release), `EXPO_PUBLIC_SENTRY_DSN`을 설정한다. 소스맵·네이티브 심볼 업로드용 `SENTRY_AUTH_TOKEN`은 빌드 전용 비밀값이며 `EXPO_PUBLIC_` 접두사를 붙이지 않는다. EAS 빌드에는 별도로 비밀 환경변수를 설정해야 한다.
- `metro.config.js`는 Sentry Debug ID를 번들·소스맵에 추가하고, `app.json`의 Sentry Expo config plugin은 네이티브 빌드 업로드를 구성한다. `ios/`, `android/` 생성물은 저장소에 추가하지 않는다.
- 성능 추적·Replay·로그·세션 추적과 breadcrumb를 끈다. JavaScript 이벤트는 사용자·요청·부가 정보를 제거하고 오류 설명·타입·스택을 남긴다. 오류 설명의 URL·이메일·토큰·비밀번호·한국 휴대전화 패턴은 웹과 동일하게 마스킹한다. 패턴 밖 개인정보를 탐지하지 못하므로 오류 메시지에 사용자 원문을 넣지 않는다. **네이티브 크래시는 JavaScript `beforeSend`를 거치지 않는다.** 네이티브 이벤트의 전체 개인정보 제거를 보장하지 않으며 출시 전에 Sentry 서버 측 데이터 정제와 실제 크래시 내용을 점검한다.
- Expo Go에서는 네이티브 크래시 수집을 검증할 수 없다. config plugin 적용 후 개발/배포용 네이티브 앱을 다시 빌드해야 한다. 현재 전송 조건에서는 배포 모드 빌드로 수신을 확인한다.
- 설치와 설정은 [Sentry Expo 가이드](https://docs.sentry.io/platforms/react-native/guides/expo/), 네이티브 정제 한계는 [이벤트 필터링 문서](https://docs.sentry.io/platforms/react-native/configuration/filtering/)를 참고한다.

## 검증 명령

- `apps/mobile-shell`: `pnpm exec tsc --noEmit`, `pnpm test`. lint의 현재 제약은 [모바일 앱 실행과 테스트](../workflows/mobile-testing.md)를 확인한다.
- Sentry JavaScript 이벤트 정제: `apps/mobile-shell`에서 `pnpm test`
- `packages/bridge`: `yarn workspace @app/bridge typecheck`, `lint`
- WebView가 가리키는 주소는 개발 시 `EXPO_PUBLIC_DEV_WEB_URL`, Release에서 `EXPO_PUBLIC_WEB_URL`을 자동 선택한다. `apps/mobile-shell/.env.example`을 확인한다.

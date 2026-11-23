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
    index.tsx           첫 화면: WebView 하나(로그인·온보딩), 로그인 화면이면 뒤에 배경 영상
    (tabs)/
      _layout.tsx       iOS 시스템 탭 바(NativeTabs)
      feed.tsx photos.tsx bunch.tsx my.tsx   탭마다 WebView
  modules/
    tab-crossfade/      탭 전환 80ms 크로스페이드·선택 햅틱(로컬 Expo 모듈, iOS ObjC)
  assets/
    tab-icons/          탭 아이콘(디자인 시스템 SVG → PNG 1x·2x·3x)
    floating-icons/     플로팅 버튼 아이콘(같은 방식, 더하기·더보기)
  src/
    web-view/AppWebView.tsx   bridge 구현과 공통 WebView(출처 제한·Safe Area·뒤로가기·오류 화면)
    tabs/                     탭 ID·경로 판정(tabs.ts), 아이콘(tab-icons.ts), 저장소, 탭 화면(TabScreen.tsx), 플로팅 버튼(NativeFloatingButton.tsx)
    login-background/         로그인 배경 영상(LoginBackgroundVideo.tsx, expo-video)과 표시 여부 저장소
    safe-area-script.ts, sentry.ts, sanitize-sentry-event.ts, web-url.ts, gallery-image.ts, permissions.ts (+ *.test.mjs)
```

검증은 `apps/mobile-shell`에서 `pnpm test`와 `pnpm exec tsc --noEmit`으로 실행한다.

## WebView 기본 동작

[mobile-shell-webview.md](mobile-shell-webview.md)로 옮겼다(문서 길이, 2026-11-23).

## Safe Area

[mobile-shell-webview.md](mobile-shell-webview.md)로 옮겼다(문서 길이, 2026-11-23).

## 실행과 테스트

시뮬레이터·실기기의 최초 설치, 다음 실행, Expo Go·개발 앱 구분, Xcode·EAS 빌드와 확인 항목은
[모바일 앱 실행과 테스트](../workflows/mobile-testing.md)를 따른다.
실행 절차는 해당 문서에서 관리하며, 이 문서는 구조와 런타임 계약을 다룬다.

## 권한과 출시 전 확인

가입 때 사진·카메라·알림 권한을 요청하는 `requestPermission`과, 팝업 없이 현재 상태만 읽는 `getPermissionStatus`(bridge, `src/permissions.ts`)만 구현했다(약관 화면의 시작하기가 사진 → 카메라 → 알림 순서로 호출, 허용·거부와 무관하게 다음으로 진행). 사진·카메라는 `expo-image-picker`, 알림은 `expo-notifications`로 요청하며 상태는 `granted`·`denied`(다시 물을 수 없음)·`undetermined`로 돌려준다. 사용 목적 문구는 `app.json`의 `expo-image-picker` 플러그인에 Figma Alert 문구로 넣었다. 새 네이티브 모듈이라 개발 앱·EAS 빌드는 다시 만들어야 하고, 실기기에서 팝업은 확인하지 못했다. 나머지 항목은 아직 구현 전이다. 다른 프로젝트의 App Store 심사 경험(UGC 신고·차단 미구현으로 1.2 거절)에서 가져온 확인 목록이며, 내부 기획 문서의 앱 심사 항목과 함께 본다. `getPermissionStatus`는 알림 설정 화면이 기기 알림 권한을 읽고 설정에서 돌아온 뒤 다시 확인하는 데 쓰며 `Notifications.getPermissionsAsync`를 부른다. 실기기에서 확인하지 못했다. bridge 계약이 바뀌었으니 쉘 폴더에서 `pnpm install`을 다시 실행해 bridge 타입을 받아야 한다.

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
- pnpm 11의 최소 공개 기간 정책(공개 후 하루가 지나야 설치)을 예외 없이 지킨다. `expo install`이 갓 나온 패치를 고르면서 `pnpm-workspace.yaml`에 `minimumReleaseAgeExclude`를 자동으로 넣을 수 있으니, 넣었다면 지우고 정책을 통과하는 패치로 범위를 맞춘다(예: `expo-router` `~58.0.30`).

## iOS 시스템 탭 바

[mobile-shell-native-ui.md](mobile-shell-native-ui.md)로 옮겼다(문서 길이, 2026-11-23).

## iOS 26 플로팅 버튼

[mobile-shell-native-ui.md](mobile-shell-native-ui.md)로 옮겼다(문서 길이, 2026-11-23).

## 네이티브 토스트

[mobile-shell-native-ui.md](mobile-shell-native-ui.md)로 옮겼다(문서 길이, 2026-11-23).

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

실제 구현은 [AppWebView.tsx](../../apps/mobile-shell/src/web-view/AppWebView.tsx)를 따른다. `createWebView`는 `appPostMessageSchema`를 받는다. 네이티브 → 웹 이벤트는 플로팅 버튼 눌림(`nativeFloatingButtonPress`), 탭 알림(`nativeTabEvent`), 탭 다시 누름(`nativeTabReselect`), 탭 꾹 누름(`nativeTabLongPress`), 토스트 동작(`nativeToastAction`), 눌린 푸시(`pushOpened`)다. 탭 WebView가 여럿이라 `postMessage`의 기본값(마지막에 만든 WebView에만 보냄) 대신 `broadcast: true`로 보낸다. 여러 WebView가 같은 bridge를 쓴다.

`bridge()`에는 **인라인 객체 리터럴**을 넘긴다. 미리 `AppBridgeMethods` 타입을 선언한 변수를 넘기면 TypeScript가 index signature 불일치로 거부한다(이름 있는 타입은 fresh literal 취급을 받지 못한다).

### 웹 쪽 호출 (`apps/web/src/shared/bridge/client.ts`)

실제 구현은 [bridge client](../../apps/web/src/shared/bridge/client.ts)를 따른다. `linkBridge<AppBridge, AppPostMessageSchema>`로 메서드와 이벤트 계약을 함께 지정한다.

`initialBridge`는 WebView 밖(일반 브라우저)에서 실행될 때의 폴백이다. `isWebViewBridgeAvailable`로 지금 네이티브 쉘 안인지 확인할 수 있다. 다만 `@webview-bridge/web` 1.8.0은 `isWebViewBridgeAvailable`과 `isNativeMethodAvailable` 모두 initialBridge 폴백 이름까지 「있음」으로 센다. 그래서 폴백이 있는 `appBridge`로는 이전 쉘에 그 메서드가 있는지 알 수 없다. 쉘이 실제로 구현했는지는 initialBridge가 없는 bridge로 판정하는 `hasNativeMethod`(`apps/web/src/shared/bridge/client.ts`)를 쓴다(#481).

## 새 bridge 메서드를 추가하려면

1. `packages/bridge/src/schema.ts`에 zod schema를 추가한다.
2. `packages/bridge/src/index.ts`의 `AppBridgeMethods`에 메서드 시그니처를 추가한다.
3. `apps/mobile-shell/src/web-view/AppWebView.tsx`의 `bridge({...})`에 실제 네이티브 구현을 추가한다.
4. `apps/web`의 bridge client에 `initialBridge` 폴백을 추가한다(웹 전용 대체 동작이 있다면).
5. 양쪽에서 typecheck를 돌려 계약이 어긋나지 않는지 확인한다(`yarn workspace @app/bridge typecheck`, `apps/mobile-shell`에서 `pnpm exec tsc --noEmit`).

## 갤러리 사진 선택

[mobile-shell-bridges.md](mobile-shell-bridges.md)로 옮겼다(문서 길이, 2026-11-23).

## 클립보드 bridge

[mobile-shell-bridges.md](mobile-shell-bridges.md)로 옮겼다(문서 길이, 2026-11-23).

## WebView 미디어 재생

[mobile-shell-bridges.md](mobile-shell-bridges.md)로 옮겼다(문서 길이, 2026-11-23).

## 소셜 로그인 bridge

[mobile-shell-bridges.md](mobile-shell-bridges.md)로 옮겼다(문서 길이, 2026-11-23).

## 인증 — 아직 설계 전

지금 `apps/web`의 BFF는 httpOnly 쿠키에만 의존한다(`docs/architecture/api-boundary.md`). WebView는 쿠키 지속성이 불안정할 수 있어, 실제로 로그인 흐름을 이 쉘에 연결하기 전에 쿠키 유실 대응 설계가 필요하다. 쿠키 유실 대응은 아직 결정 전이며, 정하면 이 문서와 `api-boundary.md`를 함께 갱신한다.

## 오류 모니터링

- 네이티브 쉘은 `@sentry/react-native`로 조직 `bunch-01`의 `bunch-mobile` 프로젝트에 오류를 보낸다. WebView 안의 웹 오류는 기존 웹 Sentry 프로젝트가 수집한다.
- `index.ts`에서 앱을 읽기 전에 SDK를 초기화하고, `App`을 `Sentry.wrap`으로 감싼다. 개발 모드에서는 전송을 끄며, 배포 빌드와 `EXPO_PUBLIC_SENTRY_DSN`이 있을 때만 수집한다.
- `apps/mobile-shell/.env.local`에 `EXPO_PUBLIC_DEV_WEB_URL`(개발), `EXPO_PUBLIC_WEB_URL`(Release), `EXPO_PUBLIC_SENTRY_DSN`을 설정한다. 소스맵·네이티브 심볼 업로드용 `SENTRY_AUTH_TOKEN`은 빌드 전용 비밀값이며 `EXPO_PUBLIC_` 접두사를 붙이지 않는다. EAS 빌드에는 별도로 비밀 환경변수를 설정해야 한다.
- `metro.config.js`는 Sentry Debug ID를 번들·소스맵에 추가하고, `app.json`의 Sentry Expo config plugin은 네이티브 빌드 업로드를 구성한다. `ios/`, `android/` 생성물은 저장소에 추가하지 않는다.
- 성능 추적·Replay·로그·세션 추적과 breadcrumb를 끈다. JavaScript 이벤트는 사용자·요청·부가 정보를 제거하고 오류 설명·타입·스택을 남긴다. 오류 설명의 URL·이메일·토큰·비밀번호·한국 휴대전화 패턴은 웹과 동일하게 마스킹한다. 패턴 밖 개인정보를 탐지하지 못하므로 오류 메시지에 사용자 원문을 넣지 않는다. **네이티브 크래시는 JavaScript `beforeSend`를 거치지 않는다.** 네이티브 이벤트의 전체 개인정보 제거를 보장하지 않으며 출시 전에 Sentry 서버 측 데이터 정제와 실제 크래시 내용을 점검한다.
- Expo Go에서는 네이티브 크래시 수집을 검증할 수 없다. config plugin 적용 후 개발/배포용 네이티브 앱을 다시 빌드해야 한다. 현재 전송 조건에서는 배포 모드 빌드로 수신을 확인한다.
- 설치와 설정은 [Sentry Expo 가이드](https://docs.sentry.io/platforms/react-native/guides/expo/), 네이티브 정제 한계는 [이벤트 필터링 문서](https://docs.sentry.io/platforms/react-native/configuration/filtering/)를 참고한다.

## 검증 명령

- `apps/mobile-shell`: `pnpm exec tsc --noEmit`, `pnpm test`. 같은 검사를 `.github/workflows/mobile-shell.yml`이 쉘·bridge 변경 PR에서 실행한다. lint의 현재 제약은 [모바일 앱 실행과 테스트](../workflows/mobile-testing.md)를 확인한다.
- Sentry JavaScript 이벤트 정제: `apps/mobile-shell`에서 `pnpm test`
- `packages/bridge`: `yarn workspace @app/bridge typecheck`, `lint`
- WebView가 가리키는 주소는 개발 시 `EXPO_PUBLIC_DEV_WEB_URL`, Release에서 `EXPO_PUBLIC_WEB_URL`을 자동 선택한다. `apps/mobile-shell/.env.example`을 확인한다.

# Mobile Shell Workspace

Root `AGENTS.md`와 `docs/architecture/mobile-shell.md`를 먼저 따른다. 이 문서는 Expo 기반 네이티브 쉘의 추가 경계만 정의한다.

## 이 워크스페이스의 성격

- 이 앱은 화면을 직접 그리지 않는다. `react-native-webview`로 `apps/web`(Next.js)을 그대로 열고, 카메라·푸시·공유 같은 네이티브 기능만 `packages/bridge`를 통해 제공한다.
- 화면을 RN으로 다시 만드는 "진짜 네이티브 앱" 패턴은 지금 범위가 아니다. 예외는 iOS 시스템 탭 바 하나다. 이를 위해 expo-router(`app/`)로 첫 화면(WebView 하나)과 탭 화면(탭마다 WebView)을 나눈다(결정 기록 `docs/decisions/records/012-ios-system-tab-bar.md`). 그 밖의 WebView 밖 네이티브 UI는 실제로 필요해지기 전까지 추가하지 않는다.

## 폴더 구조

- 루트에는 Expo 진입점(`index.ts`)과 설정(`app.json`, `metro.config.js`, `tsconfig.json`, `package.json`)만 둔다. 화면 route는 `app/`(expo-router)에 둔다.
- 런타임 코드와 테스트는 `src/`에 둔다. 기능별 파일 묶음은 기능 폴더에 함께 두며, WebView 공통 설정과 bridge는 `src/web-view/`, 탭 정의·아이콘·저장소는 `src/tabs/`가 소유한다. `scripts/`는 빌드·개발용 CLI 스크립트가 생길 때만 쓴다.

## 패키지 매니저 예외

- 이 워크스페이스만 **pnpm**을 쓴다. Expo/Metro가 Yarn PnP를 지원하지 않기 때문이다 — `docs/decisions/records/003-mobile-shell-pnpm-exception.md`를 확인한다.
- root Yarn workspace에 포함되지 않는다(`package.json`의 `workspaces`에서 명시적으로 제외). 의존성 설치는 이 폴더 안에서 `pnpm install`로 따로 한다.
- `packages/bridge`는 `file:../../packages/bridge`로 참조한다. `packages/bridge`를 수정하면 여기서 `pnpm install`을 다시 실행해 반영한다.

## Expo 관련 주의

- Expo는 SDK 버전마다 API가 바뀐다. 작업 전에 `package.json`의 `expo` 메이저 버전을 확인하고, 필요하면 해당 버전의 공식 문서(`https://docs.expo.dev/versions/v<major>.0.0/`)를 확인한다. 기억에 의존해 구현하지 않는다.
- 네이티브 모듈을 추가할 때는 `pnpm`으로 직접 추가하지 않고 `npx expo install <package>`를 쓴다 — 설치된 SDK와 호환되는 버전을 Expo가 직접 골라준다.
- `ios/`, `android/` 디렉터리가 없으면 Continuous Native Generation 대상이다. 직접 만들거나 수정하지 않고 `app.json`과 config plugin으로 네이티브 동작을 구성한다.

## 검증

- `pnpm typecheck`(또는 `npx tsc --noEmit`), `npx expo lint`를 변경 범위에 맞춰 실행한다.
- WebView가 가리키는 `apps/web` URL은 환경변수로 관리하고 repo에 실제 배포 주소를 하드코딩하지 않는다.

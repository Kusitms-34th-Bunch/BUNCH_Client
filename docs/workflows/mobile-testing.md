# 모바일 앱 실행과 테스트

번치는 WebView로 웹을 연다. 개발할 때는 **웹 서버와 Metro(앱 개발 서버)를 함께 실행한다.**
아래는 iOS 기준이며, 구조는 [모바일 쉘 문서](../architecture/mobile-shell.md)를 참고한다.

## 최초 준비

저장소 루트에서 의존성을 설치한다.

```bash
yarn install --immutable
cd apps/mobile-shell
pnpm install --frozen-lockfile
```

앱 폴더의 `.env.example`을 참고해 `.env.local`에 개발 주소 `EXPO_PUBLIC_DEV_WEB_URL`과 운영 주소 `EXPO_PUBLIC_WEB_URL`을 설정한다. 소셜 로그인을 확인하려면 카카오·구글 키도 채운다(없으면 prebuild가 로그인 설정을 넣지 않음).
개발 실행(`__DEV__`)은 개발 주소를, Release 빌드는 운영 주소를 자동 선택한다.
주소가 없으면 다른 환경의 주소로 대체하지 않고 앱 시작 시 예외로 중단한다. 개발 중에는 오류 화면이 뜨며, 릴리스 빌드에서는 앱이 바로 종료될 수 있다.

| 확인 대상            | 웹 주소                        |
| -------------------- | ------------------------------ |
| Mac의 iOS 시뮬레이터 | `http://localhost:3000`        |
| 같은 Wi-Fi의 iPhone  | `http://<개발 PC LAN IP>:3000` |
| 배포 웹              | 접근 가능한 HTTPS 주소         |

실제 iPhone의 `localhost`는 PC를 가리키지 않는다. LAN 주소로 열면 Next.js 개발 서버가 다른 출처의 `/_next` 개발 리소스를 막아 화면이 비므로, `apps/web/next.config.mjs`의 `allowedDevOrigins`가 개발 서버를 켤 때 개발 PC의 실제 LAN IPv4 주소를 읽어 허용한다. `192.168.*.*` 같은 패턴은 `192.168.evil.com` 같은 도메인과도 맞아 개발 소스가 노출될 수 있어 쓰지 않는다. Wi-Fi를 바꿔 주소가 달라지면 개발 서버를 다시 시작한다. 가짜 서버 데이터(`NEXT_PUBLIC_API_MOCKING=enabled yarn dev`)는 `localhost`나 HTTPS 주소에서만 확인한다. `http://<개발 PC LAN IP>:3000`은 보안 컨텍스트가 아니라 MSW 서비스 워커가 등록되지 않을 수 있고, 그러면 화면은 그려지지만 요청이 실제 BFF로 나간다.
PC의 LAN IP는 macOS에서 `ipconfig getifaddr en0`, Windows에서 `ipconfig`, Linux에서 `ip addr`로 확인한다.
환경변수 파일은 커밋하지 않는다.

## 평소 실행

터미널 1은 **저장소 루트**에서 실행한다.

```bash
yarn dev
```

터미널 2는 **`apps/mobile-shell`**에서 실행한다. 아래 두 방식 중 하나를 선택한다.

| 방식                  | 명령                                      | 준비                                 |
| --------------------- | ----------------------------------------- | ------------------------------------ |
| Expo Go로 화면 확인   | `pnpm exec expo start --go --lan`         | 프로젝트 SDK와 호환되는 Expo Go 설치 |
| 번치 개발 앱으로 확인 | `pnpm exec expo start --dev-client --lan` | 아래 절차로 개발 앱을 빌드·설치      |

실제 iPhone은 PC와 같은 Wi-Fi에 연결하고 QR을 연다. Mac의 시뮬레이터는 터미널에서 `i`를 누른다.
Expo Go에서는 앱 고유 설정·네이티브 모듈을 모두 검증할 수 없다.
앱스토어의 Expo Go는 최신 SDK만 지원하므로 쉘의 SDK가 최신보다 낮으면 열리지 않는다(쉘은 SDK 58).
iOS 시스템 탭 바(expo-router 네이티브 탭)는 번치 개발 앱 기준이다. config plugin을 뺀 변경(#462의 `expo-font` 제거 등)은 `pnpm ios:sync:clean`으로 다시 만든다. 이 의존성이나 `app.json`을 바꾸면 `pnpm ios:sync`(prebuild, `pod install` 포함) 뒤 개발 앱을 다시 빌드해야 반영된다.

## iOS 개발 앱 실행 (macOS)

Xcode·iOS 시뮬레이터·CocoaPods를 준비한다. 평소에는 `pnpm ios` 하나로 실행한다.

```bash
# 터미널 1: 저장소 루트
yarn dev

# 터미널 2: apps/mobile-shell
pnpm ios
```

`pnpm ios`(`expo run:ios`)는 `ios/` 생성(prebuild)·CocoaPods 설치·빌드·시뮬레이터 설치와 실행·Metro 시작을 한 번에 한다. 이 경우 Metro를 따로 켜지 않는다.
실제 iPhone은 `pnpm ios --device`로 기기를 고르고, 기기 신뢰·개발자 모드와, 아래 유료 팀에 초대된 Apple 계정의 Xcode 로그인이 필요하다. bundle ID·팀·capability가 바뀐 뒤(#439) 이전에 만든 `ios/`가 있으면 먼저 `pnpm ios:sync`를 실행하고, 그래도 예전 값이 남으면 `pnpm ios:sync:clean`으로 다시 만든다.
서명 팀은 `app.json`의 `ios.appleTeamId`(`9CGCR9499H`, 유료 Developer Program 팀, #439)로 정해져 있어 prebuild가 Xcode 프로젝트에 넣는다. 그래서 Xcode에서 팀을 고르지 않으며, 이 팀에 초대된 Apple 계정으로 Xcode에 로그인해야 실기기에 설치할 수 있다. Sign in with Apple capability(`ios.usesAppleSignIn`)는 개인(무료) 팀으로 서명할 수 없다.
`pnpm android`(`expo run:android`)도 같은 방식이지만 아직 검증하지 않았다.
Android 폴더를 맞추는 명령은 `pnpm android:sync`(`expo prebuild --platform android --no-clean`)다. Android는 CocoaPods 단계가 없고 네이티브 패키지를 Gradle이 빌드할 때 연결하므로, iOS처럼 조건부 설치 스크립트를 두지 않는다(2026-11-11 실행 약 9초). `app.json`의 Android `package`가 비어 있으면 prebuild가 기존 `android/`의 값을 `app.json`에 써 넣으니, 출시 식별자를 정하기 전에는 그 변경을 커밋하지 않는다. 처음부터 다시 만들려면 `pnpm android:sync:clean`을 쓴다.
`ios/`, `android/`는 생성물이므로 직접 수정하거나 커밋하지 않는다.

Xcode에서 서명이나 빌드 로그를 직접 봐야 하면 수동으로 연다. 앱 폴더에서 `ios/`를 맞춘 뒤 Xcode로 열고 **Run**을 누른다. `pnpm ios:sync`(`scripts/ios-sync.mjs`)는 `expo prebuild --platform ios --no-clean`이며 Capacitor의 `cap sync`에 해당한다. `app.json`, 아이콘·스플래시 이미지, 네이티브 패키지를 바꿨을 때 다시 실행한다. Xcode가 열린 채로 실행하면 프로젝트를 다시 불러오지 못할 수 있어 Xcode를 닫고 실행한다.

Expo 58의 prebuild는 옵션이 없으면 `ios/`를 지우고 새로 만든다. 그러면 Pods까지 처음부터 다시 컴파일한다. 그래서 `ios:sync`는 기존 폴더에 바뀐 것만 반영한다(`--no-clean`).
`--no-clean`의 prebuild는 직접 추가한 네이티브 패키지를 감지하지 못해 `pod install`을 건너뛴다. 그래서 스크립트가 `pnpm-lock.yaml`·`ios/Podfile`·`ios/Podfile.properties.json`과 앱 안 네이티브 모듈(`modules/*`)의 `expo-module.config.json`·podspec이 지난 sync 때와 다르면 `pod install`을 실행한다(기록은 `ios/.pods-lock-hash`). pod install이 끝나지 않으면 기록을 지우고 실패로 끝나 다음 sync에서 다시 시도한다. JS 패키지만 바뀌어도 실행되며, 이때 다음 빌드는 약 200초 걸린다.
플러그인·네이티브 패키지를 제거했거나, Expo SDK를 올렸거나(새 네이티브 템플릿은 `ios/`가 있으면 복사되지 않음), `ios/`가 꼬였을 때만 `pnpm ios:sync:clean`으로 새로 만든다. 이때 `ios/.xcode.env.local` 같은 로컬 설정도 지워진다.

| 측정(2026-11-10, Apple M5, Xcode 26.6, 시뮬레이터 Debug) | sync    | 다음 빌드 |
| -------------------------------------------------------- | ------- | --------- |
| `ios:sync:clean`(새로 만들기)                            | 34~40초 | 314~321초 |
| `ios:sync`(`--no-clean`)                                 | 1초     | 18~22초   |

```bash
pnpm ios:sync
pnpm open:ios
```

Xcode는 앱을 설치할 뿐 JS는 Metro에서 받으므로, 이 경우에는 `pnpm exec expo start --dev-client --lan`을 계속 켜 둔다.

- 웹·TypeScript 수정: 서버 갱신으로 확인한다.
- `.env.local` 수정: Metro를 종료하고 실행 명령에 `--clear`를 붙여 재시작한다.
- 네이티브 패키지·앱 설정·Expo SDK 수정: prebuild 후 앱을 다시 빌드·설치한다.
- `packages/bridge` 수정: 앱 폴더에서 `pnpm install` 후 양쪽 타입을 검사한다.

앱 식별자 `ios.bundleIdentifier`는 유료 팀에 등록한 `kr.bunch.app`이다(#439). 바꾸면 Apple Developer App ID, 카카오·Google 콘솔의 iOS 번들 ID, 백엔드의 Apple 토큰 audience를 함께 바꾼다.

## Windows·Linux에서 확인

Expo Go는 위의 평소 실행 절차를 그대로 따른다.
iOS 시뮬레이터와 로컬 Xcode 빌드는 macOS에서만 가능하다.
앱 고유 기능은 팀이 공유한 EAS 개발 앱을 iPhone에 설치해 확인한다.
새 기기가 서명 대상에 없으면 기기 등록 후 재서명 또는 재빌드가 필요하다.

## EAS 빌드가 필요할 때

[mobile-release-build.md](mobile-release-build.md)로 옮겼다(문서 길이, 2026-11-23).

## 쉘 E2E(Maestro)

[mobile-e2e.md](mobile-e2e.md)로 옮겼다(문서 길이, 2026-11-23).

## 테스트와 오류 해결

앱 폴더에서 자동 검사를 실행한다.

```bash
pnpm exec tsc --noEmit
pnpm test
```

기기에서는 Safe Area·키보드·입력 시 확대·단계 이동·입력 유지·웹 로딩 실패·VoiceOver를 확인한다.
결과에 기기·OS·실행 방식·확인 동작을 남기고, 로그·화면의 개인정보와 토큰은 제거한다.

| 증상                           | 확인                                                                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 환경변수 누락                  | 앱의 `.env.local` 확인 후 Metro를 `--clear`로 재시작                                                                                                     |
| 8081 포트 충돌                 | 기존 Metro 터미널에서 종료한 뒤 하나만 실행                                                                                                              |
| 서버 연결 실패                 | 웹·Metro 실행, PC LAN IP, Wi-Fi, 방화벽·로컬 네트워크 권한 확인                                                                                          |
| `main has not been registered` | 먼저 출력된 오류와 Metro 실행 폴더 확인                                                                                                                  |
| Xcode·CocoaPods 오류           | 설치 상태와 `DEVELOPER_DIR` 확인. `pnpm ios:sync`는 기본값 `/Applications/Xcode.app`을 쓰므로 다른 경로의 Xcode(베타 등)는 `DEVELOPER_DIR`를 지정해 실행 |
| Hermes `BINARY`/`UTF-8` 오류   | 프로젝트 경로에 한글이 있으면 영문 경로로 옮긴 뒤 prebuild 재시도                                                                                        |

현재 ESLint 의존성이 없어 `expo lint`는 실행되지 않는다.
2026-10-18 확인 범위는 타입 검사·단위 테스트·iOS JS 번들·CocoaPods 설치다.
`pnpm ios` 실행을 포함한 Xcode 컴파일·개발 앱 실행·실기기·EAS·Android 동작은 아직 검증하지 않았다.

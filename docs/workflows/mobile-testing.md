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

앱 폴더의 `.env.example`을 참고해 `.env.local`에 개발 주소 `EXPO_PUBLIC_DEV_WEB_URL`과 운영 주소 `EXPO_PUBLIC_WEB_URL`을 설정한다.
개발 실행(`__DEV__`)은 개발 주소를, Release 빌드는 운영 주소를 자동 선택한다.
주소가 없으면 다른 환경의 주소로 대체하지 않고 앱 시작 시 예외로 중단한다. 개발 중에는 오류 화면이 뜨며, 릴리스 빌드에서는 앱이 바로 종료될 수 있다.

| 확인 대상            | 웹 주소                        |
| -------------------- | ------------------------------ |
| Mac의 iOS 시뮬레이터 | `http://localhost:3000`        |
| 같은 Wi-Fi의 iPhone  | `http://<개발 PC LAN IP>:3000` |
| 배포 웹              | 접근 가능한 HTTPS 주소         |

실제 iPhone의 `localhost`는 PC를 가리키지 않는다.
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

## iOS 개발 앱 실행 (macOS)

Xcode·iOS 시뮬레이터·CocoaPods를 준비한다. 평소에는 `pnpm ios` 하나로 실행한다.

```bash
# 터미널 1: 저장소 루트
yarn dev

# 터미널 2: apps/mobile-shell
pnpm ios
```

`pnpm ios`(`expo run:ios`)는 `ios/` 생성(prebuild)·CocoaPods 설치·빌드·시뮬레이터 설치와 실행·Metro 시작을 한 번에 한다. 이 경우 Metro를 따로 켜지 않는다.
실제 iPhone은 `pnpm ios --device`로 기기를 고르고, 기기 신뢰·개발자 모드·Xcode 서명 설정이 필요하다.
`pnpm android`(`expo run:android`)도 같은 방식이지만 아직 검증하지 않았다.
`ios/`, `android/`는 생성물이므로 직접 수정하거나 커밋하지 않는다.

Xcode에서 서명이나 빌드 로그를 직접 봐야 하면 수동으로 연다. 앱 폴더에서 한 번 생성한 뒤 Xcode로 열고 **Run**을 누른다.

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
pnpm exec expo prebuild --platform ios
pnpm open:ios
```

Xcode는 앱을 설치할 뿐 JS는 Metro에서 받으므로, 이 경우에는 `pnpm exec expo start --dev-client --lan`을 계속 켜 둔다.

- 웹·TypeScript 수정: 서버 갱신으로 확인한다.
- `.env.local` 수정: Metro를 종료하고 실행 명령에 `--clear`를 붙여 재시작한다.
- 네이티브 패키지·앱 설정·Expo SDK 수정: prebuild 후 앱을 다시 빌드·설치한다.
- `packages/bridge` 수정: 앱 폴더에서 `pnpm install` 후 양쪽 타입을 검사한다.

앱 식별자 `ios.bundleIdentifier`는 현재 개인 값(`com.kyeongjooni.mobile-shell`)이다. 팀 공용 값으로 바꾸는 시점은 Apple Developer·EAS 설정과 함께 정한다.

## Windows·Linux에서 확인

Expo Go는 위의 평소 실행 절차를 그대로 따른다.
iOS 시뮬레이터와 로컬 Xcode 빌드는 macOS에서만 가능하다.
앱 고유 기능은 팀이 공유한 EAS 개발 앱을 iPhone에 설치해 확인한다.
새 기기가 서명 대상에 없으면 기기 등록 후 재서명 또는 재빌드가 필요하다.

## EAS 빌드가 필요할 때

로컬 Xcode 실행에는 EAS가 필요 없다. 클라우드 빌드는 앱 폴더에서 준비한다.

1. `pnpm dlx eas-cli@latest login` 후 `pnpm dlx eas-cli@latest init`으로 프로젝트를 연결한다.
2. EAS의 개발 환경에는 `EXPO_PUBLIC_DEV_WEB_URL`, 미리보기·운영 환경에는 `EXPO_PUBLIC_WEB_URL`을 설정한다. Release 앱은 HTTPS 웹 주소를 쓴다.
3. Sentry를 쓰면 `EXPO_PUBLIC_SENTRY_DSN`과 업로드용 Secret `SENTRY_AUTH_TOKEN`을 설정한다.
4. iPhone 빌드는 유료 Apple Developer 계정·서명을 준비하고 `pnpm dlx eas-cli@latest device:create`로 기기를 등록한다.

프로필은 [`eas.json`](../../apps/mobile-shell/eas.json)에서 선택한다.

| 프로필                                  | 용도                                             |
| --------------------------------------- | ------------------------------------------------ |
| `development` / `development-simulator` | Metro에 연결하는 iPhone / 시뮬레이터 개발 앱     |
| `preview` / `preview-simulator`         | Metro 없이 실행하는 iPhone / 시뮬레이터 미리보기 |
| `production`                            | 스토어 빌드. 제출은 별도로 진행                  |

```bash
# 사용할 프로필로 바꿔 실행
pnpm dlx eas-cli@latest build --platform ios --profile development
```

완료된 설치 링크를 등록한 iPhone에서 연다. 시뮬레이터 프로필에는 기기 등록·배포 서명이 필요 없다.
미리보기·스토어 앱도 WebView가 여는 웹 서버는 접근 가능해야 한다.
첫 EAS 빌드에서는 독립 pnpm 구성이 선택되는지 확인한다.
업로드에 `packages/bridge`, 앱 lockfile이 포함되고 `.env.local`이 제외되는지도 확인한다.
자세한 절차는 [Expo 개발 빌드](https://docs.expo.dev/develop/development-builds/introduction/)와 [내부 배포](https://docs.expo.dev/build/internal-distribution/)를 따른다.

### App Store 제출용 환경변수

양식은 [`.env.production.example`](../../apps/mobile-shell/.env.production.example)에 둔다.
파일 자체는 자동 적용되지 않는다. EAS 프로젝트 설정의 **Environment variables**에서 `production` 환경에 등록한다.

| 변수                             | 값·공개 범위                       |
| -------------------------------- | ---------------------------------- |
| `EXPO_PUBLIC_WEB_URL`            | 실제 운영 HTTPS 주소, Plain text   |
| `EXPO_PUBLIC_SENTRY_DSN`         | 오류 수집 사용 시 DSN, Plain text  |
| `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | `production` (`eas.json`에 설정됨) |
| `SENTRY_AUTH_TOKEN`              | 소스맵 업로드 사용 시 토큰, Secret |

등록 후 `--profile production`으로 빌드한다. 빌드 전에 `EXPO_PUBLIC_WEB_URL`이 등록됐는지 반드시 확인한다. 등록하지 않으면 빌드는 성공하고 설치한 앱이 시작하자마자 종료된다(`preview`도 같다). 빌드 후에는 설치한 앱이 열리는지 첫 실행을 확인하고, 운영 웹 접속과 앱 식별자·버전도 확인한다.
개발용 `.env.local`을 운영 값으로 덮어쓰지 않는다. Xcode에서 직접 Archive할 때는 해당 빌드에도 운영 변수를 별도로 적용해야 한다.
스토어 제출에는 유료 Apple Developer 계정이 필요하며, 현재 제출용 빌드는 검증하지 않았다.

## 테스트와 오류 해결

앱 폴더에서 자동 검사를 실행한다.

```bash
pnpm exec tsc --noEmit
pnpm test
```

기기에서는 Safe Area·키보드·입력 시 확대·단계 이동·입력 유지·웹 로딩 실패·VoiceOver를 확인한다.
결과에 기기·OS·실행 방식·확인 동작을 남기고, 로그·화면의 개인정보와 토큰은 제거한다.

| 증상                           | 확인                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| 환경변수 누락                  | 앱의 `.env.local` 확인 후 Metro를 `--clear`로 재시작              |
| 8081 포트 충돌                 | 기존 Metro 터미널에서 종료한 뒤 하나만 실행                       |
| 서버 연결 실패                 | 웹·Metro 실행, PC LAN IP, Wi-Fi, 방화벽·로컬 네트워크 권한 확인   |
| `main has not been registered` | 먼저 출력된 오류와 Metro 실행 폴더 확인                           |
| Xcode·CocoaPods 오류           | 설치 상태와 `DEVELOPER_DIR` 확인                                  |
| Hermes `BINARY`/`UTF-8` 오류   | 프로젝트 경로에 한글이 있으면 영문 경로로 옮긴 뒤 prebuild 재시도 |

현재 ESLint 의존성이 없어 `expo lint`는 실행되지 않는다.
2026-10-18 확인 범위는 타입 검사·단위 테스트·iOS JS 번들·CocoaPods 설치다.
`pnpm ios` 실행을 포함한 Xcode 컴파일·개발 앱 실행·실기기·EAS·Android 동작은 아직 검증하지 않았다.

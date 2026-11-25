# 모바일 앱 배포 빌드

EAS 빌드, 버전·빌드 번호, App Store 제출용 환경변수다. 개발 앱 실행은 [mobile-testing.md](mobile-testing.md)를 본다.

## EAS 빌드가 필요할 때

로컬 Xcode 실행에는 EAS가 필요 없다. 클라우드 빌드는 앱 폴더에서 준비한다.

1. `pnpm dlx eas-cli@latest login` 후 `pnpm dlx eas-cli@latest init`으로 프로젝트를 연결한다.
2. EAS의 개발 환경에는 `EXPO_PUBLIC_DEV_WEB_URL`, 미리보기·운영 환경에는 `EXPO_PUBLIC_WEB_URL`을 설정한다. 모든 환경에 `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`·`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`(Plain text)도 등록한다. 없으면 `app.config.js`가 EAS 빌드를 멈춘다. Release 앱은 HTTPS 웹 주소를 쓴다.
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

### 버전과 빌드 번호

앱 버전은 `app.json`의 `version`, iOS 빌드 번호는 `ios.buildNumber`에 둔다(2026-11-20). prebuild(`ios:sync`)가 이 값을 `Info.plist`의 `CFBundleShortVersionString`·`CFBundleVersion`에 숫자로 쓴다. 그래서 Xcode General 탭의 Version·Build 칸을 바꿔도 Archive에는 반영되지 않는다. General 탭이 보여 주는 빌드 설정(`MARKETING_VERSION`·`CURRENT_PROJECT_VERSION`)은 prebuild가 바꾸지 않아 템플릿 값(1.0)이 남으므로, `ios:sync`가 끝에 이 두 값도 `app.json`으로 맞춘다(2026-11-23).

- Xcode Archive로 올릴 때: `ios.buildNumber`를 App Store Connect에 올린 같은 버전의 마지막 번호보다 크게 올리고 커밋한 뒤 `pnpm ios:sync`를 하고 Archive한다. 버전을 바꾸면(`version`) 빌드 번호는 다시 1부터 써도 된다.
- Xcode Archive의 Sentry 소스맵 업로드는 Xcode 셸 단계에서 돌아 앱 폴더 `.env.local`을 읽지 않는다. 그래서 `pnpm ios:sync`(`--clean` 포함)가 `ios/.xcode.env.local`(gitignore)에 `.env.local`의 `SENTRY_AUTH_TOKEN`을 빌드 때 읽어 `export`하는 줄을 넣는다(토큰 값은 복사하지 않음). 이 줄이 없으면 Archive가 `Auth token required`로 실패한다(2026-11-23). 업로드 없이 올리려면 같은 파일에 `export SENTRY_DISABLE_AUTO_UPLOAD=true`를 둔다(오류 화면의 스택을 읽을 수 없게 됨).
- 업로드 뒤 App Store Connect의 알려진 경고(2026-11-23 확인, 업로드는 성공). 둘 다 무시해도 된다.
  - `SDK version issue`: 2027년 4월부터 Xcode 27(iOS 27 SDK) 빌드만 받는다는 예고다. 그 전에 Xcode를 올리고 Expo SDK 호환을 함께 확인한다.
  - `Upload Symbols Failed`: React·hermesvm·ReactNativeDependencies·SDWebImage·ExpoImageManipulator처럼 미리 빌드된 프레임워크는 dSYM을 함께 배포하지 않는다. Apple 크래시 리포트에서 그 프레임워크 안의 위치만 주소로 보이고, 앱 실행·심사에는 영향이 없다. 없애려면 소스 빌드(`buildReactNativeFromSource` 등)가 필요해 빌드 시간이 크게 늘어 쓰지 않는다. 오류는 Sentry로 본다.
- EAS로 올릴 때: `eas.json`이 `appVersionSource: remote`·`autoIncrement`라 EAS가 번호를 관리하고 `ios.buildNumber`는 쓰지 않는다. 두 방법을 섞으면 번호가 겹칠 수 있으니 EAS 첫 빌드 전에 `pnpm dlx eas-cli@latest build:version:set -p ios`로 마지막 번호에 맞춘다.

#### 버전을 올리는 기준

앱 버전은 `주.부.수`(MAJOR.MINOR.PATCH) 세 자리다(2026-11-23 사용자 결정). 화면은 웹이라 웹만 바뀌면 스토어에 다시 내지 않으므로, 새 앱 파일(네이티브)을 제출할 때만 버전을 올린다.

| 바뀐 것                                            | 올리는 자리                | 예                                       |
| -------------------------------------------------- | -------------------------- | ---------------------------------------- |
| 웹만                                               | 올리지 않음(제출하지 않음) | 화면·문구·웹 버그                        |
| 네이티브 버그 수정, 앱 설정                        | 수(PATCH)                  | 쉘 버그, 언어·권한 문구 설정             |
| 새 네이티브 기능(로컬 모듈, bridge 메서드)         | 부(MINOR)                  | 탭 꾹 누르기·화면 전체 전환(#518, 1.1.0) |
| 최소 iOS 버전 상향, 이전 웹과 함께 쓸 수 없는 변경 | 주(MAJOR)                  |                                          |

- 한 자리를 올리면 그 오른쪽 자리는 0으로 돌린다(1.0.1 → 1.1.0, 1.4.2 → 2.0.0). 자리마다 10을 넘어도 이어서 센다(1.9.0 → 1.10.0).
- 한 번의 제출에 여러 종류가 섞이면 가장 큰 자리 하나만 올린다.
- 같은 버전을 다시 제출할 때(심사 거절 뒤 수정 등)는 버전은 두고 빌드 번호만 올린다.
- 새 bridge 메서드를 쓰는 웹은 그 메서드가 없는 이전 앱 버전에서도 동작해야 한다(`hasNativeMethod`로 확인).

#### 이전 앱을 업데이트로 막기

웹과 함께 쓸 수 없게 된 이전 앱은 `apps/web/src/features/app-update/lib/appVersionPolicy.ts`의 `MINIMUM_APP_VERSION`을 올려 막는다(#577). 이 값보다 낮은 앱은 닫을 수 없는 업데이트 모달을 본다. 웹 배포만으로 적용되며, 새로 연 앱은 약 1분(응답 캐시 60초), 이미 열려 있던 앱은 마지막 확인에서 30분이 지나 앱으로 돌아올 때 막힌다.

- 새 버전이 App Store에서 「판매 중」이 된 뒤에 올린다. 심사 중에 올리면 사용자가 받을 업데이트가 없다. 심사 빌드는 더 새 버전이라 막히지 않는다.
- 같은 버전 안의 이전 빌드만 막을 때는 `build`도 올린다.
- 버전을 알려 주지 못하는 이전 앱(1.1.1 이하)은 1.1.1 빌드 1로 보고 비교한다. 최소값을 이보다 올리면 이전 앱 모두가 막힌다.
- 빌드 번호는 `app.json`의 `ios.buildNumber`를 읽는다(Xcode Archive 기준). EAS의 자동 번호(`autoIncrement`)는 이 값에 반영되지 않으므로, EAS로 바꿀 때는 쉘이 읽는 값부터 다시 정한다(그 전에는 `build` 비교가 맞지 않음).

### TestFlight 테스터용 빌드와 심사용 빌드

TestFlight 테스터는 개발 백엔드를, 심사자와 App Store 사용자는 운영 백엔드를 쓴다(#581). 웹은 운영 하나이고, 테스터용 쉘만 WebView User-Agent 끝에 `BunchShell/staging`을 붙인다. 웹이 이 표시를 보면 서버 요청은 `API_BASE_URL_STAGING`, 실시간 연결은 `NEXT_PUBLIC_WS_URL_STAGING`으로 보낸다.

- 같은 버전을 빌드 번호만 달리해 두 번 Archive한다. 테스터용은 `pnpm ios:sync --staging` 뒤 Archive해 TestFlight 테스터 그룹에만 배포하고, 심사용은 `pnpm ios:sync`(옵션 없음) 뒤 Archive해 심사에 제출한다. `ios:sync`가 `ios/.xcode.env.local`에 `EXPO_PUBLIC_API_ENV=staging` 줄을 넣거나 지우고, 실행 끝에 이번 Archive가 어느 쪽인지 출력한다.
- 실행 중에 TestFlight인지 판별(sandbox 영수증)하지 않는다. 심사 기기도 같은 판정이라 심사자가 개발 서버에 붙는다.
- 테스터 요청은 로그인 쿠키 이름도 따로 쓴다(`accessToken_stg`·`refreshToken_stg`, `authCookieNames`). 같은 기기에서 운영 앱과 TestFlight 앱을 오가도 운영 토큰이 개발 백엔드로, 개발 토큰이 운영으로 가지 않고, 앱마다 따로 로그인 상태가 남는다. 테스터 요청의 프록시 응답은 공유 캐시에 남지 않게 항상 `private, no-store`다.
- `EXPO_PUBLIC_API_ENV`는 앱 폴더 `.env*`에 넣지 않는다. Archive 번들이 `.env*`도 읽어 `pnpm ios:sync`로 지워지지 않고 심사용에 남는다.
- 웹의 두 변수(`API_BASE_URL_STAGING`, `NEXT_PUBLIC_WS_URL_STAGING`)는 함께 넣거나 함께 비운다. 하나만 있으면 실시간 토큰과 연결 서버가 엇갈린다.
- 테스터가 개발 백엔드에서 만든 초대 링크는 개발 데이터라 운영 사용자·링크 미리보기에서는 열리지 않는다.
- 표시는 누구나 꾸밀 수 있어 권한 판단에 쓰지 않는다. 꾸미면 운영 웹을 거쳐 개발 백엔드에 붙을 뿐이다.
- `EXPO_PUBLIC_*` 값은 번들 캐시 키에 들어가 값이 바뀌면 캐시가 갈린다(`babel-preset-expo` 58 코드 확인). 실제 빌드로는 확인하지 못했으니 첫 테스터용·심사용 빌드에서 각각 어느 서버 데이터가 보이는지 확인한다.

### App Store 제출용 환경변수

양식은 [`.env.production.example`](../../apps/mobile-shell/.env.production.example)에 둔다.
파일 자체는 자동 적용되지 않는다. EAS 프로젝트 설정의 **Environment variables**에서 `production` 환경에 등록한다.

| 변수                               | 값·공개 범위                                         |
| ---------------------------------- | ---------------------------------------------------- |
| `EXPO_PUBLIC_WEB_URL`              | 실제 운영 HTTPS 주소, Plain text                     |
| `EXPO_PUBLIC_SENTRY_DSN`           | 오류 수집 사용 시 DSN, Plain text                    |
| `EXPO_PUBLIC_SENTRY_ENVIRONMENT`   | `production` (`eas.json`에 설정됨)                   |
| `SENTRY_AUTH_TOKEN`                | 소스맵 업로드 사용 시 토큰, Secret                   |
| `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` | 카카오 네이티브 앱 키, Plain text(없으면 빌드 멈춤)  |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | 구글 iOS 클라이언트 ID, Plain text(없으면 빌드 멈춤) |

등록 후 `--profile production`으로 빌드한다. 빌드 전에 `EXPO_PUBLIC_WEB_URL`이 등록됐는지 반드시 확인한다. 등록하지 않으면 빌드는 성공하고 설치한 앱이 시작하자마자 종료된다(`preview`도 같다). 빌드 후에는 설치한 앱이 열리는지 첫 실행을 확인하고, 운영 웹 접속과 앱 식별자·버전도 확인한다.
쉘이나 쉘을 부르는 웹 코드를 바꿨으면 빌드 전에 쉘 E2E([mobile-e2e.md](./mobile-e2e.md))를 로컬에서 돌리거나 `mobile-e2e.yml`을 수동 실행해 통과를 확인한다.
개발용 `.env.local`을 운영 값으로 덮어쓰지 않는다. Xcode에서 직접 Archive할 때는 해당 빌드에도 운영 변수를 별도로 적용해야 한다.
스토어 제출에는 유료 Apple Developer 계정이 필요하며, 현재 제출용 빌드는 검증하지 않았다.

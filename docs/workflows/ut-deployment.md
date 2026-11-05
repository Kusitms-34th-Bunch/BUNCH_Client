# UT 배포(Vercel)와 홈 화면 앱(PWA)

UT 시나리오와 가짜 서버 세팅은 [usability-test.md](./usability-test.md)를 본다.

UT는 가짜 서버(MSW 서비스 워커)가 필요하다. 시연 방식은 두 가지다: **iPhone에서 네이티브 쉘(Expo Go)로 시연**(UT 최종 방식, 아래 「Expo Go로 시연」)하거나 **브라우저·홈 화면 앱(PWA)** 으로 시연한다. 쉘의 WebView는 서비스 워커를 쓸 수 없을 것으로 알려져 있었지만, iPhone Expo Go(SDK 58)에서 가짜 서버가 문제없이 동작하는 것을 확인했다.

## 배포

웹(`apps/web`) 하나만 Vercel 프로젝트로 만든다(admin은 UT에 쓰지 않음). 공유 패키지(`design-system`·`api-core`·`bridge`)는 `build` 스크립트 없이 소스(`.ts`)를 그대로 가져가므로 따로 빌드하지 않고 웹 빌드가 함께 컴파일한다. 다만 Yarn PnP가 루트의 `.pnp.cjs` 하나로 워크스페이스를 연결하므로 **설치는 저장소 루트에서** 해야 한다. 이 설정은 `apps/web/vercel.json`에 있다(`installCommand`, `buildCommand`).

배포는 **main 브랜치 기준**이다. `.github/workflows/ut-deploy.yml`이 main에 push(develop → main 머지)되면 자동으로 배포하고, 수동 실행으로 리허설·재배포·롤백을 한다.

### Vercel 프로젝트(계정에서 직접, 한 번만)

개인 계정(Hobby)에서 시작했다. Hobby는 조직 소유 비공개 저장소를 Vercel에 연결하지 못하는 것으로 알고 있어, **Git 연결 없이 CLI로 프로젝트를 만든다**(`yarn dlx vercel@latest link`: 새 프로젝트 `bunch-ut`, Git 연결 No, 코드 위치 `apps/web`). Hobby는 비상업 용도 요금제라 UT에는 맞지만 정식 운영에는 맞지 않는다(UT 이후 팀과 정한다).

| 항목                                                                 | 값                                                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 프로젝트                                                             | **UT 전용**(운영과 분리), 이름 `bunch-ut`                                                       |
| Git 연결                                                             | 없음(Actions로 배포)                                                                            |
| Root Directory                                                       | `apps/web`                                                                                      |
| Include source files outside of the Root Directory in the Build Step | 켬                                                                                              |
| Node.js Version                                                      | 24.x(`package.json`의 `engines.node >=24`)                                                      |
| Framework Preset                                                     | Next.js(`vercel.json`에도 지정됨)                                                               |
| Install / Build Command                                              | `apps/web/vercel.json`이 지정하므로 대시보드에서 덮어쓰지 않는다                                |
| 환경 변수                                                            | **넣지 않는다.** 가짜 서버 변수(`NEXT_PUBLIC_API_MOCKING`)는 workflow가 빌드 단계에서 고정한다  |
| Deployment Protection                                                | 참여자 폰에서 열려야 하므로 프로덕션 접속에 Vercel 로그인이 걸려 있지 않은지 시크릿 창으로 확인 |

`vercel link`는 `.vercel/project.json`(프로젝트 ID·계정 ID)을 만든다. `.vercel`은 gitignore 대상이다. 이 명령이 `.gitignore` 끝에 `.vercel`과 `.env*`를 덧붙이는데, `.env*`는 `.env.example` 예외를 뒤집으므로 **덧붙은 부분은 지운다.**

### GitHub secret(저장소 Settings → Secrets and variables → Actions)

| secret                 | 값                                                                   |
| ---------------------- | -------------------------------------------------------------------- |
| `VERCEL_TOKEN`         | Vercel 계정 Settings → Tokens에서 만든 토큰                          |
| `VERCEL_ORG_ID`        | `.vercel/project.json`의 `orgId`(Hobby도 `team_…` 형태)              |
| `VERCEL_UT_PROJECT_ID` | `.vercel/project.json`의 `projectId`(운영 프로젝트 ID를 넣지 않는다) |

### 배포 방법

- **자동**: develop → main PR이 머지되면 `UT Deploy`가 실행된다.
- **수동**: Actions 탭 → UT Deploy → Run workflow에서 ref를 골라 실행한다(기본 develop). main 머지 전에 develop으로 **리허설**하거나, 실패했을 때 다시 올리거나 이전 커밋으로 되돌릴 때 쓴다. workflow 파일이 기본 브랜치(develop)에 있어야 Actions 탭에 보인다.
- 완료되면(약 3~5분) 실행 요약에 배포 주소가 남고 Vercel 대시보드에도 보인다.

**UT 기간에는 main에 머지하지 않는다.** main 머지가 곧 UT 주소 갱신이라 참여자 화면이 바뀐다.

- GitHub Actions 러너(CI와 같은 환경)에서 설치·빌드하고 결과물만 Vercel에 올리므로 Vercel 빌드 환경의 Yarn PnP 불확실성을 피한다.
- 토큰은 `vercel pull`·`deploy` 단계에만 주고, 저장소 코드를 실행하는 빌드 단계에는 주지 않는다. `vercel` CLI는 65.1.0으로 고정했다(토큰이 있는 단계가 매번 최신 패키지를 실행하지 않도록).
- `vercel pull`이 받은 프로젝트 환경 변수는 빌드 단계(저장소 코드 실행)에서 보인다. **UT 프로젝트에는 비밀 값을 환경 변수로 넣지 않는다.**
- workflow는 배포 전에 Vercel API로 프로젝트 이름을 받아 `bunch-ut`인지 확인하고 아니면(이름을 받지 못하는 경우도) 멈춘다(운영 프로젝트 ID를 UT secret에 잘못 넣어도 가짜 서버 빌드가 운영에 올라가지 않게). 프로젝트 이름을 바꾸면 workflow의 `EXPECTED_PROJECT_NAME`도 바꾼다.
- Vercel에 GitHub를 연결해 직접 빌드하는 방식(`apps/web/vercel.json`의 명령과 `ENABLE_EXPERIMENTAL_COREPACK=1`, `NEXT_PUBLIC_API_MOCKING=enabled` 환경 변수가 필요)은 쓰지 않는다. Actions와 함께 켜면 같은 커밋이 두 번 배포된다.

**CLI로 직접 올릴 때**(`vercel --prod`): **로컬 작업 폴더에서 바로 올리지 않는다.** 로컬 폴더에는 `.env.pr-review`(GitHub 토큰)·`.env.openapi.local` 같은 gitignore 대상 비밀 파일이 있을 수 있다. 업로드 제외 규칙이 이를 걸러 주는지 확인하지 않았으므로 새로 clone한 깨끗한 폴더에서 배포한다.

### 첫 리허설 결과

- 수동 실행(ref=develop) 1차: 프로젝트 확인과 `vercel pull`은 통과했고, Root Directory 설정과 설치 명령(`cd ../.. && yarn install --immutable`)도 정상이었다.
- `vercel build`에서 `NEXT_NO_VERSION`(Next.js 버전을 찾지 못함)으로 실패했다. 원인은 Yarn PnP다. 저장소에 `node_modules`가 없어 Vercel의 Next.js 빌더가 `node_modules/next`를 찾지 못한다.
- 대응: workflow에 `YARN_NODE_LINKER=node-modules`를 넣어 이 workflow에서만 `node_modules` 방식으로 설치한다(`.yarnrc.yml`의 `nodeLinker: pnp`는 그대로 둔다). 이 우회가 빌드·배포 전체를 통과시키는지는 다음 리허설에서 확인한다.
- 처음 workflow를 실행했을 때 `workflow_dispatch` 요청이 HTTP 500으로 한 번 실패했다. 이후 정상 실행되어 GitHub 쪽 일시 오류로 본다.

### 아직 확인하지 않은 것

- `YARN_NODE_LINKER=node-modules` 우회로 `vercel build`·`deploy`가 끝까지 통과하는지(1차 리허설은 `vercel build`에서 멈췄고 그 앞 단계는 통과), 배포 URL 출력이 요약에 제대로 남는지는 다음 리허설에서 확인한다. main 머지로 처음 실행되지 않도록 develop 기준 수동 리허설을 먼저 통과시킨다.
- Hobby의 한도(일일 배포 수 등)와 요금제 조건은 현재 정책을 확인하지 못했다.
- 이름·아이콘이 의도대로 보이는지, 서비스 워커·가짜 서버가 켜지는지는 실기기에서 확인한다.

### UT 이후 정리할 것

- push(main) 트리거를 끄거나 workflow를 제거한다(main이 운영에 쓰이면 계속 UT 프로젝트를 갱신하게 됨).
- preview/production 분리, `vercel` CLI 버전 갱신 방식(지금은 65.1.0으로 고정, 올릴 때 workflow의 버전을 직접 바꿈), 자동 배포 범위, 요금제(Hobby 이후)와 계정 소유(개인 → 팀)를 팀과 정한다.

배포 뒤 확인할 것: 주소가 폰에서 열린다, 개발자 도구(또는 원격 디버깅)에서 서비스 워커가 등록된다, `/manifest.webmanifest`가 응답한다, 번치 홈에 「여행쥬아」와 기존 번들 2개가 보인다(가짜 서버가 켜진 증거).

## Expo Go로 시연(iPhone, 네이티브 쉘)

네이티브 화면(iOS 시스템 탭 바)을 보여 주기 위해 `apps/mobile-shell`을 Expo Go로 실행해 시연한다. 쉘은 `react-native-webview`로 배포된 UT 주소를 열 뿐이라 웹 화면과 가짜 서버(MSW)는 PWA와 같다. 쉘 코드는 PC의 개발 서버(Metro)가 폰으로 내려 주므로 **빌드와 PR 머지가 필요 없다.**

### 왜 SDK를 58로 올렸나

- 앱스토어의 Expo Go는 **최신 SDK만 지원**한다(실물 iPhone에는 옛 Expo Go를 설치할 방법이 없다). 쉘이 SDK 57일 때 최신 Expo Go가 SDK 58이어서 "SDK가 맞지 않는다"며 열리지 않았다.
- 유료 Apple Developer 계정이 없어 개발 빌드(EAS)·TestFlight·기기 등록 설치를 쓸 수 없고, PC가 Windows라 Xcode 무료 서명도 불가능해서 iPhone에서는 Expo Go가 유일한 경로다.
- 그래서 `apps/mobile-shell`을 Expo SDK 58로 올렸다(`expo ~58.0.23`, `react-native 0.88.1`, `react-native-webview 14.0.1`, `expo-router ~58.0.30`, `@sentry/react-native ~8.28.0` 등). 업그레이드는 `expo install`로 했고 `expo-doctor` 20개 검사, 타입 검사, 쉘 테스트 30개, iOS JS 번들 생성(`expo export`)을 통과했다. 아래 실행 방법으로 iPhone Expo Go에서 쉘과 가짜 서버가 동작하는 것도 확인했다.

### 실행 방법(Windows PC + iPhone)

준비물: 같은 Wi-Fi의 PC와 iPhone, 앱스토어에서 받은 **최신 Expo Go**, 배포된 UT 주소(Actions 실행 요약 또는 Vercel 대시보드).

1. 의존성 설치: `apps/mobile-shell`에서 `pnpm install --frozen-lockfile`
2. 주소 설정: `apps/mobile-shell/.env.local`(커밋하지 않는 파일)에 UT 주소를 넣는다.
   ```
   EXPO_PUBLIC_DEV_WEB_URL=https://<UT 배포 주소>
   EXPO_PUBLIC_WEB_URL=https://<UT 배포 주소>
   ```
   개발 실행(`__DEV__`)은 앞의 값을 쓴다. `EXPO_PUBLIC_*`는 번들링할 때 들어가므로 값을 바꾸면 Metro를 끄고 `--clear`로 다시 시작한다.
3. 개발 서버 시작: `pnpm exec expo start --go --lan --clear`
4. iPhone의 카메라로 터미널의 QR을 스캔해 Expo Go에서 연다. 연결이 안 되면 Windows 방화벽이 Node를 막고 있는지 확인한다.

### 시연 때 주의할 것

- **개발 서버(Metro)를 시연 내내 켜 둔다.** PC가 꺼지거나 Wi-Fi가 끊기면 쉘이 멈춘다. PC와 iPhone은 같은 Wi-Fi여야 한다.
- **시연 폰의 Expo Go 자동 업데이트를 꺼 둔다**(설정 → App Store → 앱 업데이트). 앱스토어의 Expo Go가 다음 SDK(59)로 올라가면 SDK 58 쉘을 다시 열 수 없다. 시연 직전에는 앱스토어에서 Expo Go를 업데이트하지 않는다.
- 시연 전에 QR로 쉘이 열리고 번치 홈에 「여행쥬아」와 기존 번들 2개가 보이는지 확인한다.
- Expo Go에서는 쉘의 자체 iOS 네이티브 모듈(탭 전환 크로스페이드, 탭 햅틱)과 `expo-font` config plugin(탭 라벨 글꼴)이 적용되지 않는다. 쉘이 이 모듈을 JS에서 쓰지 않아 앱이 죽지는 않고 해당 효과만 빠진다. 탭 햅틱은 Expo Go일 때 JS(`expo-haptics`)로 대신 울린다. iOS 시스템 탭 바와 WebView는 Expo Go에서도 동작한다.
- 진행자 장치(번치 홈 캐릭터 5번, 작성 화면 헤더 5번)와 Safe Area, 이미지 로딩은 시연 폰에서 한 번 확인한다.
- 시연용 `.env.local`은 커밋하지 않는다. 실제 배포 주소를 저장소에 하드코딩하지 않는다.

### 아직 확인하지 않은 것

- 안정 API인 `expo-router/native-tabs`로의 전환(ADR 012의 계획)은 하지 않았다. 지금 쉘은 검증된 `expo-router/unstable-native-tabs`를 그대로 쓰고, SDK 58에도 두 경로가 모두 있다. UT 이후에 전환한다.
- 시연 중 장시간 사용(메모리, WebView 여러 개)과 네트워크 불안정 상황은 확인하지 않았다.
- 개발 빌드(EAS)로 시연하는 방법은 Apple Developer 계정이 준비된 뒤의 후속 선택지다.

## 홈 화면 추가

- 앱 이름은 **bunch**다(`app/manifest.ts`의 `name`·`short_name`, iOS는 `app/layout.tsx`의 `appleWebApp.title`).
- 설치한 앱은 `/bunch`(번치 홈)에서 시작하고 주소창 없이(`display: standalone`) 세로로 열린다.
- 아이콘은 확정 전이라 **임시 아이콘**(전달받은 눈 캐릭터 이미지, 386px 원본을 줄이거나 512px로 약간 확대해 만듦)이다. 눈이 중앙에 모여 있어 maskable에도 같은 이미지를 쓴다. 실제 아이콘이 오면(1024px 정사각 원본을 권장) `apps/web/public/icons`의 같은 파일명으로 교체한다.

| 파일                           | 크기      | 쓰이는 곳                                                        |
| ------------------------------ | --------- | ---------------------------------------------------------------- |
| `icon-192.png`, `icon-512.png` | 192·512px | Android 설치 아이콘(매니페스트)                                  |
| `icon-maskable-512.png`        | 512px     | Android 적응형 아이콘(가장자리가 잘려도 되게 중앙 80% 안에 그림) |
| `apple-touch-icon.png`         | 180px     | iOS 홈 화면 아이콘(iOS는 매니페스트 아이콘을 쓰지 않음)          |

- iOS: Safari 공유 메뉴 → 「홈 화면에 추가」. Android: Chrome 메뉴 → 「앱 설치」 또는 「홈 화면에 추가」.
- **저장소가 분리된다**: 브라우저 탭에서 쌓은 가짜 DB와 홈 화면 앱의 가짜 DB는 서로 다르다. 참여자가 쓸 방식 하나로 통일하고, 초기화·리허설도 같은 방식으로 한다.
- 매니페스트와 아이콘 파일의 존재는 자동 테스트(`app/manifest.test.ts`)가 확인한다. 실제 기기에서 홈 화면에 추가했을 때 이름·아이콘이 의도대로 보이는지, 주소창이 없는지는 아직 확인하지 않았다(실기기 리허설에서 확인).

# UT 배포(Vercel)와 홈 화면 앱(PWA)

UT 시나리오와 가짜 서버 세팅은 [usability-test.md](./usability-test.md)를 본다.

UT는 가짜 서버(서비스 워커)가 필요해 **브라우저·홈 화면 앱(PWA)** 으로 진행한다. 네이티브 쉘(Expo)의 WebView에서는 서비스 워커를 쓸 수 없어(`mocks/browser.ts` 주석) 가짜 서버가 켜지지 않는다.

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
- workflow는 `vercel pull` 뒤 프로젝트 이름이 `bunch-ut`인지 확인하고 아니면 멈춘다(운영 프로젝트 ID를 UT secret에 잘못 넣어도 가짜 서버 빌드가 운영에 올라가지 않게). 프로젝트 이름을 바꾸면 workflow의 `EXPECTED_PROJECT_NAME`도 바꾼다.
- Vercel에 GitHub를 연결해 직접 빌드하는 방식(`apps/web/vercel.json`의 명령과 `ENABLE_EXPERIMENTAL_COREPACK=1`, `NEXT_PUBLIC_API_MOCKING=enabled` 환경 변수가 필요)은 쓰지 않는다. Actions와 함께 켜면 같은 커밋이 두 번 배포된다.

**CLI로 직접 올릴 때**(`vercel --prod`): **로컬 작업 폴더에서 바로 올리지 않는다.** 로컬 폴더에는 `.env.pr-review`(GitHub 토큰)·`.env.openapi.local` 같은 gitignore 대상 비밀 파일이 있을 수 있다. 업로드 제외 규칙이 이를 걸러 주는지 확인하지 않았으므로 새로 clone한 깨끗한 폴더에서 배포한다.

### 아직 확인하지 않은 것

- `ut-deploy.yml`은 한 번도 실행해 보지 않았다. 처음 실행에서 `vercel pull`·`build`가 저장소 루트에서 Root Directory(`apps/web`) 설정과 함께 동작하는지, `yarn dlx vercel@65.1.0`이 Yarn PnP 저장소에서 실행되는지, 배포 URL 출력이 요약에 제대로 남는지 확인한다. main 머지로 처음 실행되지 않도록 develop 머지 뒤 수동 리허설을 먼저 한다.
- Hobby의 한도(일일 배포 수 등)와 요금제 조건은 현재 정책을 확인하지 못했다.
- 이름·아이콘이 의도대로 보이는지, 서비스 워커·가짜 서버가 켜지는지는 실기기에서 확인한다.

### UT 이후 정리할 것

- push(main) 트리거를 끄거나 workflow를 제거한다(main이 운영에 쓰이면 계속 UT 프로젝트를 갱신하게 됨).
- preview/production 분리, `vercel` CLI 버전 갱신 방식(지금은 65.1.0으로 고정, 올릴 때 workflow의 버전을 직접 바꿈), 자동 배포 범위, 요금제(Hobby 이후)와 계정 소유(개인 → 팀)를 팀과 정한다.

배포 뒤 확인할 것: 주소가 폰에서 열린다, 개발자 도구(또는 원격 디버깅)에서 서비스 워커가 등록된다, `/manifest.webmanifest`가 응답한다, 번치 홈에 「여행쥬아」와 기존 번들 2개가 보인다(가짜 서버가 켜진 증거).

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

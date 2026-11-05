# UT 배포(Vercel)와 홈 화면 앱(PWA)

UT 시나리오와 가짜 서버 세팅은 [usability-test.md](./usability-test.md)를 본다.

UT는 가짜 서버(서비스 워커)가 필요해 **브라우저·홈 화면 앱(PWA)** 으로 진행한다. 네이티브 쉘(Expo)의 WebView에서는 서비스 워커를 쓸 수 없어(`mocks/browser.ts` 주석) 가짜 서버가 켜지지 않는다.

## 배포

웹(`apps/web`) 하나만 Vercel 프로젝트로 만든다(admin은 UT에 쓰지 않음). 공유 패키지(`design-system`·`api-core`·`bridge`)는 `build` 스크립트 없이 소스(`.ts`)를 그대로 가져가므로 따로 빌드하지 않고 웹 빌드가 함께 컴파일한다. 다만 Yarn PnP가 루트의 `.pnp.cjs` 하나로 워크스페이스를 연결하므로 **설치는 저장소 루트에서** 해야 한다. 이 설정은 `apps/web/vercel.json`에 있다(`installCommand`, `buildCommand`).

### Vercel 프로젝트 설정(계정에서 직접)

| 항목                                                                 | 값                                                                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 프로젝트                                                             | **UT 전용** 새 프로젝트(운영과 분리)                                                                  |
| Root Directory                                                       | `apps/web`                                                                                            |
| Include source files outside of the Root Directory in the Build Step | 켬                                                                                                    |
| Framework Preset                                                     | Next.js(`vercel.json`에도 지정됨)                                                                     |
| Node.js Version                                                      | 24.x(`package.json`의 `engines.node >=24`)                                                            |
| Install / Build Command                                              | `apps/web/vercel.json`이 지정하므로 대시보드에서 덮어쓰지 않는다                                      |
| 환경 변수                                                            | `NEXT_PUBLIC_API_MOCKING=enabled`(Production), `ENABLE_EXPERIMENTAL_COREPACK=1`(Yarn 4를 쓰려면 필요) |
| Deployment Protection                                                | 참여자 폰에서 열려야 하므로 끄거나 프로덕션 도메인으로 배포                                           |

- `NEXT_PUBLIC_API_MOCKING`은 빌드 때 코드에 들어가므로 값을 바꾸면 **다시 배포**해야 한다. 운영 프로젝트에는 넣지 않는다(켜면 진행자 장치와 가짜 DB 초기화가 노출됨). 이 값은 `vercel.json`에 넣지 않는다(같은 설정을 쓰는 다른 프로젝트에도 켜지므로).
- UT 빌드(`NEXT_PUBLIC_API_MOCKING=enabled`)는 검색에 노출되지 않도록 `noindex`가 켜진다(`app/layout.tsx`).

### 배포 방법

- **권장: Vercel에 GitHub 저장소를 연결**해 develop 기준으로 배포한다. 커밋된 파일만 쓰므로 로컬의 비밀 파일이 올라갈 일이 없다.
- Vercel CLI(`vercel link`, `vercel --prod`)를 쓴다면 **로컬 작업 폴더에서 바로 올리지 않는다.** 로컬 폴더에는 `.env.pr-review`(GitHub 토큰)·`.env.openapi.local` 같은 gitignore 대상 비밀 파일이 있을 수 있다. 업로드 제외 규칙이 이를 걸러 주는지 확인하지 않았으므로, 새로 clone한 깨끗한 폴더에서 배포한다. `vercel link`가 만드는 `.vercel`은 gitignore에 넣어 두었다.

### 아직 확인하지 않은 것

- 위 설정으로 Vercel에서 설치·빌드가 통과하는지(처음 배포하며 확인). 특히 Yarn PnP가 Vercel 빌드 환경에서 동작하는지가 가장 불확실하다. 막히면 Vercel 환경 변수에 `YARN_NODE_LINKER=node-modules`를 추가해 그 환경에서만 `node_modules` 방식으로 설치해 본다.
- 그래도 안 되면 CLI로 `vercel build` 후 `vercel deploy --prebuilt`로 올린다(`.github/workflow-templates/vercel-deploy.yml`이 쓰는 방식).
- 자동 배포(GitHub Actions)는 하지 않는다. 템플릿은 있지만 secret과 모노레포 빌드 검증이 필요해 UT 이후로 미룬다.

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

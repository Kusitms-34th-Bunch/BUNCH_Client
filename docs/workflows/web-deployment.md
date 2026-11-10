# 웹 배포(Vercel)와 홈 화면 앱(PWA)

운영 웹(`apps/web`)은 실제 서버에 연결된 빌드를 Vercel 운영 프로젝트에 올린다. 운영 확인은 배포 주소로 하고, 개발은 로컬 개발 서버로 한다. 앱 쉘은 개발 실행이 `EXPO_PUBLIC_DEV_WEB_URL`(로컬), Release 빌드가 `EXPO_PUBLIC_WEB_URL`(배포 주소)을 연다([mobile-testing.md](./mobile-testing.md)).

## 배포 흐름

`.github/workflows/web-deploy.yml`이 배포한다.

- **자동**: develop → main PR이 머지되면(main push) 배포한다. 웹 빌드에 영향이 없는 변경(문서 등)만 들어오면 실행하지 않는다(`paths`).
- **수동**: Actions 탭 → Web Deploy → Run workflow에서 ref를 골라 다시 올린다(기본 main, main에 있던 커밋만). workflow 파일이 기본 브랜치(develop)에 있어야 Actions 탭에 보인다. 루트 설정(`tsconfig.json`, `turbo/**` 등)만 바꾼 변경은 자동 배포되지 않으므로 필요하면 수동 실행한다.
- **블루그린 전환**: 새 버전을 운영 환경 변수로 올리되 운영 주소는 연결하지 않고(`--skip-domain`), 그 배포 주소에서 `/login`과 `/manifest.webmanifest`가 열리는지 확인한 뒤에만 운영 주소를 넘긴다(`vercel promote`). 확인이 실패하면 사용자는 이전 버전을 계속 본다. 보호된 배포 주소는 `vercel curl`이 토큰으로 열어 별도 우회 secret이 필요 없다.
- **되돌리기**: Vercel 배포는 버전마다 그대로 남아 있어, 대시보드의 Instant Rollback(또는 이전 배포 promote)으로 다시 빌드하지 않고 바로 이전 버전으로 돌린다. 이전 커밋을 다시 빌드할 때만 수동 실행을 쓴다.
- **빌드 캐시**: Next.js 빌드 캐시(`apps/web/.next/cache`)를 `yarn.lock`·소스 해시를 키로 이어 쓴다. 로컬 기준 캐시 없이 43초, 있을 때 21~23초였다(2026-11-10, CI 효과는 첫 배포 뒤 측정). 캐시는 main과 기본 브랜치(develop)에서 실행된 workflow만 쓸 수 있다. 공급망 사고(의존성·저장소 코드 오염)가 의심되면 Actions → Caches에서 `web-deploy-next-` 캐시를 지운 뒤 다시 배포한다(오염된 컴파일 결과가 캐시에 남을 수 있음).
- 트래픽 일부만 새 버전으로 보내는 점진 배포(카나리)는 Vercel Rolling Releases가 필요하고 현재 요금제(Hobby)에서 쓸 수 있는지 확인하지 않았다.

| job        | Vercel 토큰 | 저장소 코드 | 하는 일                                                                                                                                                                                |
| ---------- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings` | 있음        | 없음        | secret 확인 → 프로젝트 이름(`bunch-web`) 확인 → `.vercel/project.json`만 다음 job에 넘김                                                                                               |
| `build`    | 없음        | 실행        | main 커밋 확인 → 변조 가드 → 설치 → 빌드 캐시 복원 → `vercel build --prod` → 결과물에 MSW 코드 없는지 확인                                                                             |
| `deploy`   | 있음        | 없음        | 빈 `apps/web` 폴더 만들기(CLI가 프로젝트 Root Directory의 존재만 확인하고, 결과물은 루트 `.vercel/output`을 올림) → 새 버전 올리기(`--skip-domain`) → 확인 → 운영 주소 전환(`promote`) |

- job을 나누는 이유: 같은 job 안에서는 앞 단계(의존성 설치·빌드가 실행하는 코드)가 `$GITHUB_ENV`·`$GITHUB_PATH`로 뒤 단계의 토큰을 가로챌 수 있다. 토큰이 있는 job은 checkout하지 않으므로 Yarn 대신 `npm exec`로 고정 버전 `vercel` CLI(65.1.0)만 실행한다. 버전을 올릴 때는 workflow의 모든 `vercel@`을 함께 바꾼다.
- 저장소는 Yarn PnP라 Vercel의 Next.js 빌더가 `NEXT_NO_VERSION`으로 실패하므로 `build` job에서만 `YARN_NODE_LINKER=node-modules`로 설치한다(`.yarnrc.yml`은 그대로).
- 가짜 서버 확인은 빌드 결과물을 본다(`_next` chunk에 `mockServiceWorker`가 있으면 멈춤). 꺼진 빌드는 0개, 켠 빌드는 1개 chunk인 것을 로컬 빌드로 확인했다(2026-11-10).
- 롤백으로 수동 실행하면 그 커밋의 변조 가드·설치 단계가 실행되므로, 가드가 들어오기 전 커밋으로는 다시 빌드하지 않는다(Instant Rollback을 쓴다).
- artifact(프로젝트 설정·빌드 결과물)는 저장소를 읽을 수 있는 사람이 받을 수 있어 하루만 보관하고, 프로젝트 환경 변수 파일은 넘기지 않는다.

## Vercel 운영 프로젝트(계정에서 직접, 한 번만)

코드를 올리지 않고 빈 프로젝트만 만든다. 저장소 밖 빈 폴더에서 `npm exec --yes -- vercel@65.1.0 login` 뒤 `npm exec --yes -- vercel@65.1.0 project create bunch-web`(팀 계정이면 `--scope <팀>`)을 실행하고, 아래 설정은 대시보드에서 한다. Project ID는 프로젝트 Settings → General, Team ID(`VERCEL_ORG_ID`)는 팀 Settings → General에서 확인한다. 로컬 작업 폴더에서 `vercel link`·`deploy`를 실행하지 않는다(gitignore 대상 비밀 파일이 올라갈 수 있는지 확인하지 않았다).

| 항목                                                                 | 값                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 프로젝트 이름                                                        | `bunch-web`(workflow가 이 이름을 확인)                                   |
| Git 연결                                                             | 없음(Actions로 배포)                                                     |
| Root Directory                                                       | `apps/web`                                                               |
| Include source files outside of the Root Directory in the Build Step | 켬                                                                       |
| Node.js Version                                                      | 24.x(`package.json`의 `engines.node >=24`)                               |
| Install / Build Command                                              | `apps/web/vercel.json`이 지정하므로 대시보드에서 덮어쓰지 않는다         |
| Deployment Protection                                                | 앱 쉘과 사용자 폰에서 열려야 하므로 프로덕션 접속에 로그인이 걸리지 않게 |

요금제와 계정 소유(개인 Hobby는 비상업 용도)는 팀이 정한다.

### GitHub environment `production`(저장소 Settings → Environments)

모든 job이 이 environment를 쓴다. **Deployment branches를 `main`으로 제한**해 다른 브랜치의 workflow가 secret을 받지 못하게 한다. Required reviewers는 선택이다(켜면 job마다 승인을 요청한다).

| 종류     | 이름                       | 값                                                                                                                                                                                                                                                            |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| secret   | `VERCEL_TOKEN`             | Vercel 계정 Settings → Tokens에서 만든 토큰(가능하면 운영 프로젝트의 팀으로 범위를 좁힘)                                                                                                                                                                      |
| secret   | `VERCEL_ORG_ID`            | 팀 Settings → General의 Team ID(Hobby도 `team_…` 형태)                                                                                                                                                                                                        |
| secret   | `VERCEL_WEB_PROJECT_ID`    | 프로젝트 Settings → General의 Project ID                                                                                                                                                                                                                      |
| secret   | `SENTRY_AUTH_TOKEN`        | 선택. 소스맵 업로드용 Sentry **Organization Auth Token**(업로드 전용 범위, 개인 토큰 아님). 저장소 코드를 실행하는 `build` job에서 보인다                                                                                                                     |
| variable | `NEXT_PUBLIC_SENTRY_DSN`   | 오류 수집 DSN(공개 값). 환경 이름은 workflow가 `production`으로 고정                                                                                                                                                                                          |
| variable | `NEXT_PUBLIC_POSTHOG_KEY`  | 제품 분석 프로젝트 토큰(`phc_…`, 공개 값). 약관에 동의한 회원만 수집한다(ADR 018). 비우면 수집하지 않는다. 기획 요청으로 운영 키를 넣었다(2026-11-10). 개인정보 처리방침(임시 문구)에 수집 항목·국외 이전(PostHog, 미국)을 반영하는 일은 기획에 요청해 두었다 |
| variable | `NEXT_PUBLIC_POSTHOG_HOST` | 선택. 비우면 US(`https://us.i.posthog.com`), EU 프로젝트는 `https://eu.i.posthog.com`                                                                                                                                                                         |

저장소 수준(Repository secrets)에 같은 이름을 두지 않는다. environment 제한을 거치지 않고 다른 브랜치의 workflow가 받을 수 있다.

### 환경 변수(Vercel 프로젝트 → Settings → Environment Variables, Production)

서버가 실행될 때 읽는 값만 둔다. 빌드에는 쓰지 않는다(빌드 값은 위 environment).

| 변수           | 값                                                             |
| -------------- | -------------------------------------------------------------- |
| `API_BASE_URL` | 운영 백엔드 주소. 서버 전용이라 `NEXT_PUBLIC_`를 붙이지 않는다 |

- `NEXT_PUBLIC_API_MOCKING`, `DEV_TOKEN_LOGIN`, `NODE_ENV`는 어디에도 넣지 않는다. 개발용 로그인은 빌드의 `NODE_ENV`가 `production`이면 꺼지는데, 이 값을 바꾸면 닉네임만으로 토큰을 받는 경로가 열릴 수 있다.

## 운영 주소 연결

기본 주소는 `bunch-client.vercel.app`이다(2026-11-10, 프로젝트 이름은 `bunch-web`).

- 앱 쉘 Release 빌드의 `EXPO_PUBLIC_WEB_URL`에 이 주소를 넣는다(EAS production 환경, `apps/mobile-shell/.env.production.example`).
- 카카오·구글 콘솔에는 웹 도메인을 등록하지 않는다. 소셜 로그인은 앱 쉘의 네이티브 SDK(번들 ID 기준)로만 하고, 웹은 받은 토큰을 같은 도메인의 BFF(`/api/auth/login`)로 넘긴다. 브라우저에서는 소셜 로그인을 할 수 없다.
- 백엔드는 BFF가 서버에서 부르므로 브라우저 CORS 허용 출처 등록이 필요 없다.

## 배포 뒤 확인

- 배포 주소가 폰에서 열리고, 로그인 → 번치 홈까지 실제 서버 데이터로 이동한다.
- Sentry에 운영 환경(`production`) 오류가 들어온다.
- 앱 쉘 Release 빌드가 운영 주소를 연다.
- `/manifest.webmanifest`가 응답한다.

## 홈 화면 추가(PWA)

- 앱 이름은 **bunch**다(`app/manifest.ts`의 `name`·`short_name`, iOS는 `app/layout.tsx`의 `appleWebApp.title`).
- 설치한 앱은 `/bunch`(번치 홈)에서 시작하고 주소창 없이(`display: standalone`) 세로로 열린다.
- 아이콘은 임시 아이콘(눈 캐릭터 이미지)이다. 실제 아이콘이 오면(1024px 정사각 원본 권장) `apps/web/public/icons`의 같은 파일명으로 교체한다.

| 파일                           | 크기      | 쓰이는 곳                                                        |
| ------------------------------ | --------- | ---------------------------------------------------------------- |
| `icon-192.png`, `icon-512.png` | 192·512px | Android 설치 아이콘(매니페스트)                                  |
| `icon-maskable-512.png`        | 512px     | Android 적응형 아이콘(가장자리가 잘려도 되게 중앙 80% 안에 그림) |
| `apple-touch-icon.png`         | 180px     | iOS 홈 화면 아이콘(iOS는 매니페스트 아이콘을 쓰지 않음)          |

- iOS: Safari 공유 메뉴 → 「홈 화면에 추가」. Android: Chrome 메뉴 → 「앱 설치」 또는 「홈 화면에 추가」.
- 매니페스트와 아이콘 파일의 존재는 자동 테스트(`app/manifest.test.ts`)가 확인한다. 실기기에서 이름·아이콘·주소창 없음은 확인하지 않았다.

## 아직 확인하지 않은 것

- 이 workflow로 운영 프로젝트에 실제로 배포해 보지 않았다. 같은 단계(`YARN_NODE_LINKER` 우회 포함)를 쓰던 UT 배포 기록에도 1차 리허설 실패와 그 대응까지만 남아 있다([보관 기록](../archive/ut-deployment.md)).
- `public/mock/photos`(약 7MB, 시연 사진)가 운영 배포에도 정적 파일로 올라간다([가짜 서버와 서버 연동 현황](./mock-server-status.md)).
- 빌드에 Vercel 프로젝트 환경 변수를 넘기지 않으므로, `deploy --prebuilt`로 올린 서버가 실행할 때 프로젝트의 `API_BASE_URL`을 받는지는 첫 배포에서 확인한다.
- 운영에 그대로 올라가는 샘플 동작이 있다. 예: MY의 「탈퇴하기」는 로그아웃만 하고 계정·사진을 지우지 않는다([가짜 서버와 서버 연동 현황](./mock-server-status.md)의 샘플 표). 공개 전에 숨길지 정한다.
- 미리보기(스테이징) 배포는 없다. 로컬 서버 없이 develop을 실기기로 확인해야 하면 추가한다.

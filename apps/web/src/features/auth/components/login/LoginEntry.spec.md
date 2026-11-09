# 페이지: 로그인(Entry)

## 메타데이터

- Route: `/login`(`apps/web/src/app/(app)/login/page.tsx`)
- Status: UI 구현됨(`next build` 결과를 Figma 값과 측정으로 대조함. 실기기 검증 전). 웹의 소셜 로그인 연결(bridge `socialLogin` → BFF `/api/auth/login`)은 구현됨. 쉘의 네이티브 SDK는 아직 없어 앱에서도 실패 토스트가 나옴. 로그인 뒤 가입 상태별 이동(`GET /members/me/onboarding`)도 구현됨. 접근 제어와 앱 실행 시 세션 확인은 `(app)` layout의 `AuthGate`가 맡음(결정 기록 019)
- 디자인 출처: Figma `로그인`(node `4744:90759`, 배경 영상 디자인. 이전 `796:4634`). 화면설계서(node `796:5339`, 설계서 프레임 `796:9226`). 기능 spec은 `docs/specs/login-signup.md`(1.2 Entry).

## 목적과 범위

### 포함

- 앱을 처음 연 사람이 소셜 계정으로 시작하는 화면의 UI. 회원가입과 로그인을 나누지 않으므로 회원가입 버튼·이메일 입력란은 없다.
- 구성: 화면 전체 배경 영상과 검정 겹침, 버튼 바로 위 브랜딩 영역(워드마크 171×43, 슬로건 「함께한 순간이 뭉쳐, 우리가 되는 곳」)과 하단 소셜 로그인 버튼 3개(카카오 → Google → Apple, `LoginButton`).
- 진행 상태: 버튼 하나를 누르면 그 버튼은 진행 중(`aria-busy`), 나머지 둘은 비활성화된다. 진행 중에는 다른 시도를 무시한다(연타·동시 로그인 방지).
- 실패하면 토스트 「로그인에 실패했어요. 다시 시도해 주세요」를 보이고 버튼이 처음 상태로 돌아온다. 사용자가 로그인 창을 닫은 경우(`cancelled`)도 같은 토스트를 보인다(기획 1.2.6).

### 범위 외

- 쉘의 네이티브 소셜 SDK(카카오·Google·Apple). 쉘의 `socialLogin`은 지금 항상 실패하는 자리라, 앱에서도 버튼을 누르면 실패 토스트가 나온다. 웹의 호출과 BFF 로그인은 연결돼 있다.
- 앱 실행 시 세션 확인·스플래시와 단계별 접근 제어(로그인 뒤 분기 자체는 포함, 아래 Success 참고).
- 초대 정보 보관·전달.
- iPhone 상태 바·홈 인디케이터. 기기 요소라 웹이 그리지 않는다(Safe Area는 `AppFrame`이 처리한다).

## Route와 접근

- Path·params·search: `/login`. params와 search는 없다.
- 접근 권한·guard: `(app)` layout의 `AuthGate`가 서버의 가입 상태(`GET /members/me/onboarding`)로 판단한다(`lib/accessPolicy.ts`). 비로그인은 `/login`만 볼 수 있고, 가입 완료 사용자가 `/login`·`/signup/*`에 들어오면 번치 홈이나 번치 시작 선택으로 보낸다. 가입 중 사용자의 `/login`은 막지 않는다(약관의 뒤로가기가 로그인으로 돌아오는 것이 기획 1.3.5이고 로그아웃이 아직 연결되지 않았다). 상태를 확인하는 동안에는 `PageLoading`만 보이고, 실패하면 안내와 다시 시도가 나온다.
- Layout·redirect·navigation: `(app)` group의 `AppFrame` 안에서 `PageShell`을 한 번 쓴다. 이동과 redirect는 없다. 화면 전환 규칙(`AppTransitions`)에도 등록하지 않아 page 래퍼에 `data-ssgoi-transition`을 붙이지 않았다(`/signup/terms` 등으로 가는 전환 규칙을 넣을 때 함께 붙인다). 인증 전 화면이 `(app)`의 `OverlayProvider`·`Toaster`를 공유하는 것은 실패 토스트에 필요해서이고, 인증 전용 group 분리는 접근 제어를 만들 때 함께 판단한다.

## 상태와 흐름

- 초기 진입: 정적 화면이다. 데이터 요청이 없다.
- Loading: 로그인 요청 중. 누른 버튼은 눌러도 되는 모양 그대로 `aria-busy="true"`이고 나머지 둘은 `disabled`(40% 투명)라 어느 로그인이 진행 중인지 보인다. 버튼 안 로딩 표시(스피너)는 Figma에 없어 만들지 않았다. 스크린 리더에는 `aria-busy`만으로 전달이 부족해 화면에 보이지 않는 `role="status"` 문구 「로그인하는 중이에요」를 진행 중에만 채운다(문구는 임의로 정했다, 기획 확인).
- Empty: 해당 없음.
- Error·retry: 실패 시 토스트와 버튼 복귀. 토스트는 기획 명세대로 하단 버튼 바로 위에 놓는다(`bottomOffset: 170`, 기본 위치 Safe Area + 16px에서 버튼 영역(버튼 160 + 아래 14) 위 12px까지. 계산값이고 화면에서 토스트를 띄워 재지는 않음). 다시 눌러 재시도할 수 있다. 오류 원인은 따로 기록하지 않는다(Sentry 전송 없음).
- Disabled·invalid: 다른 소셜 로그인이 진행 중인 버튼.
- Success·완료 후 이동: 로그인에 성공하면 `GET /members/me/onboarding`으로 가입 상태를 읽어 도착 화면을 정하고(`lib/postLoginPath.ts`), 정해질 때까지 버튼을 잠근 채 둔 뒤 이동한다. 가입 완료 사용자는 로그인 화면이 기록에 남지 않게 `router.replace`, 가입 중 사용자는 약관의 뒤로가기가 로그인으로 돌아오도록 `router.push`한다(기획의 「로그인 해제」는 아직 없다). 읽은 가입 상태는 `setQueryData`로 세션 캐시에 채워 도착 화면의 `AuthGate`가 같은 상태로 판단하게 한다(같은 key를 `fetchQuery`로 다시 읽으면 가드가 로딩으로 바뀌어 로그인 화면이 사라지므로 쓰지 않는다). 규칙(기획 1.2.7·1.2.8): 가입 중이고 약관 미동의 → 약관 `/signup/terms`, 가입 중이고 동의 → 프로필 `/signup/profile`, 가입 완료이고 기본 번치(`defaultBunchId`) 있음 → 번치 홈 `/bunch`, 가입 완료이고 번치 없음 → 번치 시작 선택 `/onboarding`. 가입 완료 사용자의 두 경로는 다른 feature 소유라 `login/page.tsx`가 `destinations` prop으로 넘긴다. 마지막으로 쓴 번치가 유효한지의 판단(없으면 가장 최근 번치)은 서버가 `defaultBunchId`에 반영한다고 가정한다(확인할 항목).
- 가입 상태 조회 실패: 로그인은 됐지만 어디로 보낼지 모르므로 이동하지 않고 토스트 「일시적인 오류가 발생했어요. 다시 시도해 주세요」(기획 1.1.1 세션 확인 실패 문구)를 보이고 버튼이 처음 상태로 돌아온다. 쿠키는 이미 저장돼 있어 다시 누르면 이어진다. 로그인 실패 문구와는 다르다.
- 초대 정보가 있으면 가장 먼저 초대 참여로 가야 하나(기획 1.2.8) 초대 정보 보관을 만들 때 붙인다. 쉘 SDK가 없어 실제로는 로그인이 항상 실패해 이 이동은 일어나지 않는다.

## 데이터 의존성

- Query와 enabled 조건: 없음.
- Mutation·cache 영향: 로그인 호출과 가입 상태 조회는 TanStack Query를 거치지 않고 함수로 직접 호출한다(캐시 없음). `auth.session` 같은 session query는 세션 확인·guard를 만들 때 함께 정하고, 그때 로그인 성공 뒤 invalidate를 붙인다.
- API: `GET /api/v1/members/me/onboarding`(`features/auth/api/onboarding.ts`, 응답 `signupStatus`·`termsAccepted`·`defaultBunchId?`를 스키마로 검사).
- API 계약 확인 항목: 소셜 로그인 요청의 method·path·필드, 쿠키 설정 주체(`docs/specs/login-signup.md` 확인할 항목 백엔드 1~3).
- 연결 지점: `LoginEntry`의 `signIn` prop(기본값 `signInWithSocial`, 테스트에서 대체)과 `useSocialLogin`이 받는 `SignIn` 함수 타입(`(provider) => Promise<'success' | 'cancelled'>`). 서버 컴포넌트인 page에서 함수를 prop으로 넘길 수 없어 `LoginEntry`가 `features/auth/lib/socialSignIn.ts`를 직접 가져온다.
- `signInWithSocial`: 앱 쉘이 아니거나 쉘이 `socialLogin`을 지원하지 않으면 던진다(실패 토스트). 쉘 결과를 `socialLoginResultSchema`로 검사하고 요청한 provider와 같은지 확인한 뒤 `POST /api/auth/login`(`features/auth/api/login.ts`)으로 `provider`·`idToken`·`nonce`를 보낸다. `cancelled`는 BFF를 부르지 않고 취소로 돌려준다. 토큰·nonce는 저장·기록하지 않는다. 로그인 창은 사용자가 끝낼 때까지 기다리므로 타임아웃이 없는 `loginBridge`를 쓴다.

## UI와 접근성

- Component mapping: `web`의 `LoginButton`(브랜드별 색·로고, 눌림 75ms Ease Out은 컴포넌트가 처리). 브랜딩 영역은 이 화면 전용이다. 워드마크는 `src/shared/assets/images/login/wordmark.svg`(흰 픽셀 SVG)를 import해 `next/image`로 표시한다(Figma `5931:161462`, 로그인 `5878:77389`). 브랜딩 변경으로 별 심볼은 뺐다. 배경은 화면 전체(Safe Area 포함)를 덮는 영상(`public/videos/login.mp4`, `muted`·`loop`·`playsInline`·자동 재생)과 첫 프레임 포스터(`login-poster.jpg`)이고, 위에 검정 겹침(위 절반 40%, 61%부터 60%)을 깐다. 동작 줄이기 설정이면 영상 요소를 그리지 않아(`useReducedMotion`) 영상을 받지도 재생하지도 않고 포스터만 보인다.
- Keyboard·focus·accessible name: 워드마크 이미지가 화면 제목(`h1`, 이름 「Bunch」)이고 별 심볼은 장식(`alt=""`)이다. 배경 영상·겹침은 `aria-hidden`이다. 버튼 이름은 「카카오 로그인」「Google로 계속하기」「Apple로 계속하기」(Figma 문구)이고 Tab 순서는 화면 순서와 같다. 비활성 버튼은 native `disabled`라 포커스가 가지 않는다. 로그인 실패 토스트는 DS `Toaster`가 알린다. `main`은 `PageShell`이 하나만 만든다.
- Responsive·긴 텍스트·overflow: 버튼 폭은 `w-full`(화면 좌우 16px), 버튼 글자는 길면 잘린다(`LoginButton`). 375×812와 390×844에서 가로 넘침이 없다. 브랜딩 영역은 본문 영역 아래쪽(버튼 위)에 붙고, 화면이 낮아지면 본문이 스크롤된다.

| Figma            | 값                                    | 사용한 토큰·utility                                                         |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| 별 심볼↔워드마크 | 간격 6                                | `gap-s3`                                                                    |
| 워드마크↔슬로건  | 간격 8.47                             | `gap-s4`                                                                    |
| 슬로건           | SemiBold 11.86/17.79, 흰색            | `typography-caption-1-medium font-semibold text-text-inversed`              |
| 브랜딩↔버튼      | 간격 34                               | `pb-s14`(32)                                                                |
| 겹침             | 검정 30%(50.6%까지) → 60%(60.8%부터)  | `from-primitive-black-alpha-40 from-50% to-primitive-black-alpha-60 to-61%` |
| 버튼 영역        | 좌우 16, 버튼 간격 8, 아래 14(+홈 34) | `px-padding-p8 gap-s4 pb-padding-p7`                                        |
| 소셜 로그인 버튼 | 343×48, radius 12                     | `LoginButton`                                                               |

## 검증

- [ ] direct URL·새로고침·뒤로 가기: `next build`에서 `/login`이 정적 페이지로 생성되고 `next start`로 직접 URL 200 응답을 확인함. 새로고침·뒤로 가기는 확인하지 못함(미검증)
- [ ] 권한·redirect: guard가 없어 확인할 수 없음(미검증, 확인할 항목)
- [x] 상태별 UI: 기본·진행 중(누른 버튼 / 나머지 비활성)·실패·취소·성공 잠금을 테스트로 확인. 진행 중 버튼의 실제 모양은 눈으로 확인하지 못함
- [x] 관련 test: `LoginEntry.test.tsx`(제목·슬로건·main, 배경 영상 자동 재생 조건(`muted`·`playsInline`·`loop`)과 낭독 제외, 동작 줄이기 시 영상 없음, 버튼 순서, 소셜별 호출, 진행 중 상태, 연타 방지, 실패·취소·성공, 재시도, 앱 밖에서 누르면 실패 토스트, 진행 중 상태 안내)와 `socialSignIn.test.ts`(토큰·nonce 전달, Google nonce 생략, 취소, 쉘 밖·미지원, SDK 오류, 계약 위반·provider 불일치, BFF 실패. bridge와 `bffApi`는 가짜로 대체)
- [x] 실행 command와 결과: `yarn workspace @app/web test`·lint·typecheck·build 통과
- [x] Chromium(dev 서버, 창 1280×577)에서 영상 자동 재생, 앱 폭 전체를 덮는 배경, 심볼↔워드마크 6·워드마크↔슬로건 8·슬로건↔버튼 32·버튼 아래 14를 측정함. 375×812 화면과 실기기(iOS WebView 자동 재생)는 확인하지 못함

## 개발 전용 토큰 로그인

쉘의 네이티브 SDK(실기기·Mac 필요) 없이 닉네임만으로 실서버 계정의 access 토큰을 받아, 가입 이후 API까지 확인하는 장치다. 백엔드 `POST /api/v1/auth/dev/token`(요청 `{ nickname }`, 응답 `{ memberId, accessToken }`)을 쓴다.

- 켜기: `apps/web/.env.local`에 서버 전용 `DEV_TOKEN_LOGIN=enabled`(`NEXT_PUBLIC_`를 붙이지 않음)와 `API_BASE_URL`. 운영 빌드(`NODE_ENV=production`)에서는 변수가 켜져 있어도 동작하지 않는다. 가짜 서버(`NEXT_PUBLIC_API_MOCKING`)는 꺼야 실서버로 간다.
- 동작: 로그인 화면의 로고를 1.5초 안에 3번 연달아 누르면 맨 위에 닉네임 입력과 「개발용 로그인」이 나타난다(평소에는 숨김). 입력 후 → `POST /api/dev/token`(서버가 백엔드에서 토큰을 받아 `accessToken` httpOnly 쿠키로 저장, 204) → 소셜 로그인과 같은 `usePostLoginPath`로 가입 상태를 읽어 약관·프로필·번치 홈·번치 시작 선택으로 이동한다(가입 중 사용자의 `/login`은 가드가 막지 않아 직접 보내야 한다).
- 한계: refresh 토큰이 없어 access 토큰이 만료되면 재발급이 되지 않으므로 다시 발급받는다. 브라우저에서 백엔드를 직접 부르면 CORS로 막히므로(사전 요청 401) 반드시 BFF를 거친다.
- 삭제 방법: `app/api/dev/`, `features/auth/components/dev/`, `shared/api/devToken.ts`, `authCookies.ts`의 `setAccessTokenCookie`, `components/index.ts`의 `DevTokenLogin` export(`yarn gen:feature-index`), `app/(app)/login/page.tsx`의 `DEV_TOKEN_LOGIN`·`<DevTokenLogin />`, `.env.example`의 `DEV_TOKEN_LOGIN`.

## 확인할 항목

- 브랜딩 위치 (결정): Figma(`5878:77389`)는 위에서 521px 절대 배치이고 버튼과 40px 떨어져 있다. 새 Figma에는 슬로건이 없는데 지금은 유지했다(디자인 확인). 화면 높이가 달라도 버튼과의 거리가 유지되도록 버튼 위에 붙였다(간격은 가까운 토큰 32px).
- 배경 영상 용량 (결정): 원본(374×812, 25초, 약 15Mbps, 47MB)을 H.264 CRF 18·faststart로 다시 압축해 약 2.7MB로 넣었다(원본 대비 SSIM 0.991). CRF 26(약 1MB, SSIM 0.980)은 확대하면 피부·머리카락 결이 뭉개져 올렸다. 원본은 저장소에 넣지 않는다.
- 영상 해상도 (확인할 항목): 원본 폭이 374px라 3배 화면에서 흐릴 수 있다. 750px 이상 원본을 받으면 같은 방식으로 다시 압축한다.
- 움직이는 배경의 일시정지 (디자인·기획 확인): 25초 영상이 계속 반복되는데 멈추는 수단이 없다. WCAG 2.2.2(5초 넘게 자동으로 움직이는 내용은 멈출 수 있어야 함)에 못 미친다. 지금은 동작 줄이기 설정을 켠 사람만 영상을 보지 않는다. 일시정지 버튼을 둘지, 한 번 재생 뒤 마지막 장면에서 멈출지 정해야 한다(Figma에 없음).
- 낮은 화면의 슬로건 대비 (확인할 항목): 겹침 비율은 화면 높이 기준이고 브랜딩은 버튼 위에 붙어서, 낮은 화면에서는 슬로건이 겹침이 진해지는 구간(50~61%)에 걸릴 수 있다. 영상이 가장 밝은 장면에서 흰 12px 글자 대비를 실제로 재지 않았다.
- 화면 전환과 고정 배경 (확인할 항목): 배경은 `position: fixed`라 조상에 `transform`이 걸리면 기준이 바뀐다. 약관에서 로그인으로 돌아올 때 dissolve 전환(`AppTransitions`)이 걸린다. 투명도 위주라 영향이 적다고 보지만 전환 중 배경 위치는 화면에서 확인하지 않았다.
- 겹침 투명도 (토큰 차이): Figma 위쪽 검정 30%는 토큰이 없어 가장 가까운 `primitive-black-alpha-40`을 썼다(흰 글자 대비에 유리한 쪽).
- 슬로건 글자 (토큰 차이): Figma는 11.86px SemiBold·자간 -0.42로 그려져 있어 가장 가까운 `typography-caption-1-medium`(12/16)에 SemiBold를 더했다.
- 로그인 중 모양 (디자인 확인): 선택한 버튼의 로딩 표시는 Figma에 없다(`docs/specs/login-signup.md` 디자인 확인 4번).
- 실패 토스트 위치 (확정): 기획 명세가 오류 토스트를 "하단 버튼 바로 위"에 두라고 해서(`Toast.spec.md` 표시 위치) `bottomOffset`으로 버튼 영역 위 12px에 놓았다. 12px 간격은 기획·Figma에 없어 정한 값이다(디자이너 확인). Figma 설계서는 「오류 메시지 노출」이라고만 적었다. 버튼 영역 높이가 바뀌면(버튼 추가, 아래 여백 변경) 이 값도 함께 바꾼다.
- 취소 안내: 1.2.1은 버튼만 되돌린다고 하고 1.2.6은 취소도 실패 토스트를 띄운다고 해 충돌했다(`docs/specs/login-signup.md` 기획 확인 4번). 1.2.6을 따라 토스트를 보인다.
- 접근 조건 (구현됨): 위 「접근 권한·guard」. 가드는 화면 이동만 맞추고 데이터는 백엔드 API가 막는다(토큰 없음 401, 가입 중 403 `AUTH_015`). 사용 중 세션이 끝난 401은 `onUnauthorized`가 연결되지 않아 다음 상태 확인 때 로그인으로 간다(한계).
- 로그인 화면 history: 가입 완료 사용자는 로그인 뒤 `replace`로 이동해 뒤로 가도 로그인 화면이 보이지 않고, 주소로 `/login`에 닿아도 `AuthGate`가 도착 화면으로 `replace`한다(실기기 확인 전). 가입 중 사용자의 약관에서 뒤로 가면 Entry로 돌아오는 것은 기획(1.3.5)과 같다.
- 가입 상태 조합: 가입 완료인데 약관 미동의인 응답은 서버 불변식상 없다고 보고 `signupStatus`만으로 분기한다. `GET /members/me/onboarding`은 가입 중·가입 완료 모두 허용(API 명세서)이라 신규 사용자도 조회할 수 있다. 새 `signupStatus` 값이 생기면 계약 위반으로 실패한다.
- `/` 진입 (결정 보류): 기획은 `/`를 가입 상태로 도착 화면을 정하는 진입점으로 두지만, 지금 `/`는 개발용 임시 화면이라 가입 완료 사용자는 그대로 머문다(비로그인·가입 중은 가드가 로그인·가입 화면으로 보냄). 로그인 SDK를 연결해 실제로 앱을 열어 보는 단계에서 가입 완료 사용자의 `/`를 도착 화면으로 보내도록 바꾼다. 쉘이 앱 실행 때 여는 주소가 `/`인지도 확인하지 못했다.
- 조회 실패의 원인 구분 (한계): 가입 상태 조회가 계약 위반이나 새 enum 값 같은 영구 실패여도 일시 오류 문구로만 보인다. 원인은 기록하지 않는다(오류 수집 연결 때 정한다).
- 노출 전 선행 조건: 쉘의 소셜 SDK가 연결되기 전에는 버튼을 눌러도 실패 토스트만 나온다. UT·배포에 노출하기 전에 연동하거나 이 route를 노출하지 않는다. 정적 페이지로 생성되어 색인될 수 있으므로 metadata·색인 방지(`docs/workflows/seo.md`)도 이 노출 정책에 포함해 정한다.

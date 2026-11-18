# Routing And Access

route는 URL을 component로 연결하는 파일이 아니라, URL 입력·접근 조건·redirect·layout·초기 data 진입을 선언하는 경계다. 실제 인증 방식과 역할은 도입된 구현과 feature spec이 source of truth다.

## route spec에 먼저 적을 항목

- path, dynamic parameter, search parameter와 invalid input 처리
- public, authenticated, role-restricted 중 접근 수준과 확인 근거
- 직접 URL 진입 시 layout·redirect·not-found 동작
- page가 반드시 기다려야 할 data와 부분 loading이 가능한 data
- 완료 뒤 이동, browser back, URL state 동기화

## app별 책임

| App   | route가 소유하는 것                                               | 화면이 소유하는 것                            |
| ----- | ----------------------------------------------------------------- | --------------------------------------------- |
| web   | Next segment, metadata, server/client boundary, layout·redirect   | domain 조립, 사용자 상호작용, route-local UI  |
| admin | TanStack path, params/search validation, loader·prefetch·redirect | page 조립, feature action, table·form·상태 UI |

route는 raw API 요청, domain mutation, 복잡한 form state, 재사용 UI 구현을 직접 품지 않는다.

## 접근과 redirect

- 접근을 막는 route guard와 public 화면 안에서 특정 action만 막는 UI gate를 구분한다.
- redirect 대상, 원래 목적지 보존 여부, 권한 부족과 인증 만료의 사용자 경험을 spec에 적는다.
- client-only storage 값만으로 server 접근 제어가 완료됐다고 간주하지 않는다.
- 역할·권한 체계가 아직 확정되지 않았으면 임의의 enum, middleware, route group을 만들지 않고 확인할 항목으로 남긴다.

## 로그인·가입 상태 가드 (web)

- `(app)` layout의 `AuthGate`(`features/auth`)가 서버가 알려 준 가입 상태(`GET /members/me/onboarding`)로 화면 접근을 판단하고 `router.replace`로 보낸다. 판단 규칙은 `lib/accessPolicy.ts`의 순수 함수이며, 근거와 한계는 `docs/decisions/records/019-client-auth-gate.md`를 따른다.
- 새 route는 기본으로 「가입을 마친 사용자만」이다. 가입 전 화면(`/intro`, `/login`, `/signup/*`)의 예외는 `accessPolicy.ts`에서만 정한다.
- 공개 route는 `(app)` 그룹 밖에 둔다. `/invite/[token]`(초대 링크 진입 페이지)은 앱 밖(카카오톡 등)에서 들어온 비로그인 사용자도 봐야 해서 `AuthGate`·`AppFrame` 밖에 있고, 자체 layout(`app/invite/layout.tsx`)에 폰트·`QueryProvider`·`Toaster`만 둔다(`OverlayProvider`·`PendingToast`·`RouteFocus` 없음). 이 페이지에서 `(app)` 안으로 이동하면 그곳의 가드가 로그인 여부를 판별한다(`docs/workflows/invite-link-entry.md`).
- 보관된 초대(`shared/lib/pendingInvitation.ts`)가 있으면 가입 완료 사용자가 로그인·가입 화면에서 이동할 도착지가 번치 홈이 아니라 초대 진입(`/onboarding/join/enter`)이다. 접근을 넓히거나 막지는 않고 도착지만 바꾼다(`resolvePostLoginPath`의 `hasPendingInvitation`).
- 비로그인 사용자의 첫 화면은 앱 첫 실행 인트로(`/intro`)다. 본 기록(`features/auth/lib/introSeen.ts`)은 WebView 저장소에 두어 앱을 다시 설치하면 다시 보인다. 이 기록은 인트로와 로그인 중 어느 화면을 보일지만 정하고 접근 범위를 넓히지 않는다. 로그인한 사용자는 본 것으로 기록한다.
- 로그인·가입 상태가 바뀌는 동작은 `sharedKeys.session()`을 무효화하고 기다린 뒤 이동한다. 로그인은 가드가 로딩으로 바뀌지 않도록 가입 상태를 직접 읽어 같은 key에 `setQueryData`로 채운다.
- 가드는 화면 이동을 맞추는 장치이고 데이터 접근 제어는 백엔드 API가 한다.

## URL과 data

- path와 search parameter는 외부 입력이다. type assertion이 아니라 route 경계 validation과 fallback을 둔다.
- web의 404는 루트 `app/not-found.tsx` 하나다. 없는 주소와 화면이 `notFound()`를 부른 경우(예: 없는 번치 id)를 모두 받고, 안내와 번치 탭 링크를 보여 준다. `(app)` layout 밖에서 그려지므로 앱 틀(`AppFrame`), Pretendard 글꼴(`app/fonts/pretendard.ts`), iOS 쉘 탭 바 숨김(`NativeTabBarVisibility`)을 직접 갖춘다. provider(Query·overlay·toast)와 `RouteFocus`·전환은 없으므로 404 화면에 toast·query를 넣으려면 먼저 함께 옮긴다.
- 기록이 없을 때 대체 경로로 가는 web 화면의 뒤로 가기는 `shared/hooks/useBackOr`로 처리한다. 앱 안에서 들어와 기록이 있으면 `router.back()`, 링크로 바로 들어와 없으면 화면마다 정한 대체 경로로 `replace`한다. 진입 조건이 더 붙는 경우(예: 초대 화면의 `backOnLeave`)와 여러 칸 되돌리기(`history.go(-n)`)는 화면이 직접 처리한다. 기록 유무는 `window.history.length > 1`로만 판단해서, 같은 탭에서 외부 사이트를 거쳐 들어오면 `back()`이 앱 밖으로 나간다.
- response를 바꾸는 search parameter는 query key에 포함한다.
- loader·server data와 component query가 같은 request를 중복 소유하지 않게 한다. prefetch는 navigation 체감 개선 근거가 있을 때 사용한다.
- lazy loading은 측정된 초기 bundle 또는 interaction 비용을 줄일 때만 사용한다. fallback·error state 없이 route만 lazy하게 만들지 않는다.

## 검증

- direct URL, invalid params/search, not-found, refresh, browser back
- public·protected·role-restricted 동작 중 해당 범위
- loading, error, empty, redirect, forbidden 상태
- URL 변경 뒤 query·form·selection state의 보존 또는 초기화 규칙

route의 장기 접근 정책이나 URL 공개 계약을 바꾸면 `docs/decisions/` 기록 필요성을 함께 판단한다.

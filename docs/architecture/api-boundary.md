# API 경계 (BFF·인증)

브라우저 → BFF → 백엔드로 이어지는 API 호출의 경계를 다룬다. 인증 쿠키, 범용 프록시, CSRF처럼 BFF 자체를 바꿀 때 읽는다. API를 붙이는 방법(파일 배치, query key, 캐시 동기화)은 `docs/architecture/data-layer.md`를 따른다.

apps/web은 Next.js Route Handler(`src/app/api/*/route.ts`)를 BFF로 써서 브라우저와 실제 백엔드 사이에 인증 경계를 둔다. 브라우저는 같은 출처의 BFF만 호출하고, 토큰은 httpOnly 쿠키라 브라우저 코드가 읽거나 다루지 않는다.

## 백엔드 계약

- 로그인·재발급은 access·refresh 토큰을 응답 본문으로 주고, 인증은 `Authorization: Bearer`로만 받는다. 백엔드는 쿠키와 `Set-Cookie`를 쓰지 않고 CORS도 꺼져 있어 브라우저가 직접 호출할 수 없다.
- 응답은 `{ success, data, error: { code, message, detail } }` envelope이다. 성공은 `@app/api-core`의 `unwrapEnvelope`로 `data`를 꺼내고, 실패는 `normalizeError`가 `error` 안의 `code`·`message`를 읽는다.
- 재발급은 refresh 토큰을 원자적으로 교체한다. 같은 refresh 토큰으로 두 번 재발급하면 두 번째는 401이다.
- 백엔드 주소는 서버 전용 환경 변수 `API_BASE_URL`이다. `NEXT_PUBLIC_`를 붙이지 않는다. 끝 `/`는 없어도 보정한다(경로가 든 주소 대응).
- CSRF: 백엔드는 CSRF·Origin 검사가 없어 BFF가 막는다. 쿠키는 `SameSite=Lax`이고, `src/proxy.ts`(Next.js proxy, `/api/*`)가 모든 BFF 요청 앞에서 상태 변경 요청(GET·HEAD 외)의 `Sec-Fetch-Site`가 `cross-site`·`same-site`(형제 서브도메인)이면 403(`BFF_CROSS_SITE`)으로 막는다. 그래서 새 Route Handler는 따로 검사하지 않는다. `Sec-Fetch-Site`를 보내지 않는 오래된 브라우저(Safari 16.4 미만 등)는 SameSite=Lax로 cross-site만 막고 same-site는 막지 못한다. 백엔드 GET은 상태를 바꾸지 않는다는 전제다.

## 구성 요소(`src/shared/api/`)

- **`createAuthorizedRoute`**: 인증이 필요한 BFF endpoint의 wrapper다. httpOnly `accessToken` 쿠키가 없으면 401을 반환하고, 있으면 handler에 `accessToken`·검증된 `body`·`params`를 넘긴다. handler 오류는 `toErrorResponse`로 변환해, 백엔드 HTTP 오류는 상태·`code`를 그대로 전달하고(브라우저가 401로 재발급을 판단) 백엔드 연결 실패는 502(`BFF_UPSTREAM_UNAVAILABLE`), 그 외는 내부 메시지 없이 500으로 돌려준다. BFF 오류 응답은 `{ message, code }`이고, BFF가 직접 만드는 오류 코드는 `BFF_` 접두사(`BFF_UNAUTHENTICATED`, `BFF_INVALID_REQUEST`)다. 인증이 필요한 전용 BFF endpoint(아래 "BFF 경로")는 Route Handler를 직접 작성하지 않고 이 wrapper로 만든다(인증 Route Handler 제외). 일반 요청은 범용 프록시가 맡는다.
- **`serverClient`(`createServerApi`)**: RSC·Route Handler 전용 백엔드 클라이언트다(`server-only`). `accessToken`을 주면 `Authorization: Bearer`로 붙이고, 주지 않으면 공개 API(초대장 조회 등)를 인증 없이 호출한다. 브라우저 쿠키를 백엔드로 넘기지 않는다.
- **`backendProxy`(`proxyToBackend`)**: 범용 프록시의 본체다. 경로 조각을 백엔드 `api/v1/…` 경로로 바꾸고(인증 경로·빈 경로·`.`·`..`·구분자가 든 조각은 404로 거부, 조각은 URL 인코딩), access 쿠키를 `Authorization: Bearer`로 붙인다. 백엔드로는 `Accept`·`Content-Type`과 본문(multipart 포함)만 보내고 브라우저 쿠키는 보내지 않는다. 응답은 상태·본문을 그대로 돌려주되 헤더는 `Content-Type`·`Content-Disposition`·`Cache-Control`만 남기고(`Set-Cookie` 등 제거, 3xx도 `Location` 없이 전달), `Cache-Control`이 없으면 `private, no-store`를 붙인다. timeout(10초)은 응답 헤더를 받을 때까지만 적용해 큰 본문 전송을 끊지 않는다. 백엔드 연결 실패는 502다.
- **`authCookies`**: 백엔드 토큰을 httpOnly 쿠키로 발급·삭제한다. `SameSite=Lax`, 만료는 JWT `exp` 기준이다. `Secure`는 운영(`NODE_ENV=production`)에서 항상 붙이고, 개발에서는 요청이 https일 때만 붙인다(같은 망 실기기 http 주소 대응). refresh 쿠키는 `/api/auth` 경로에만 보낸다.
- **`authSession`**: 로그인·재발급·로그아웃 백엔드 호출과 `reissueOnce`다. `reissueOnce`는 같은 refresh 토큰의 재발급을 한 번만 실행해 결과를 공유하고, 성공 결과를 10초 유지해 직후 도착한 이전 토큰 요청도 같은 토큰 쌍을 받게 한다(iOS 쉘의 탭 WebView 여러 개가 쿠키를 공유해 동시에 401을 받는 경우 대비). 웹 서버 메모리 기준이라 인스턴스가 여러 개면 인스턴스 사이에는 공유되지 않는다.
- **`browserClient`(`createBrowserApi`)**: 브라우저 → BFF 클라이언트다(기본 `/api/`). 401을 받으면 `POST /api/auth/reissue`로 세션을 한 번 재발급하고 원래 요청을 한 번 재시도한다. 재발급이 실패해도 `GET /api/session`이 성공하면(다른 탭이 먼저 갱신) 성공으로 본다. 같은 탭은 Promise로, 탭 사이는 `navigator.locks`로 재발급을 묶는다. 끝내 실패하면 `onUnauthorized`를 부르고 401을 그대로 전달한다. `/api/auth/*` 자체의 401은 재발급하지 않고, 401이 아닌 오류는 이 단계에서 재시도하지 않는다(네트워크·5xx 재시도는 Query의 `createRetryPolicy`가 맡고, POST 중복 전송을 막는다).

## 인증 Route Handler(`src/app/api/auth/`)

| 경로                     | 동작                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/auth/login`   | `{ provider: 'apple' \| 'google' \| 'kakao', idToken, nonce? }`(Apple·Kakao는 `nonce` 필수)를 백엔드에 전달하고 토큰을 쿠키로 발급, 204                                                                                                                |
| `POST /api/auth/reissue` | refresh 쿠키로 `reissueOnce`, 두 쿠키 교체 후 204. 실패해도 쿠키는 지우지 않는다(다른 탭·인스턴스가 먼저 교체한 새 쿠키를 지우지 않도록). 쿠키 정리는 로그아웃이 맡는다                                                                                |
| `POST /api/auth/logout`  | 백엔드 로그아웃을 시도하고 결과(만료로 인한 401 포함)와 관계없이 쿠키 삭제, 204. 백엔드 로그아웃은 access 토큰만 받으므로 access 쿠키가 만료돼 없으면 refresh 쿠키로 재발급한 access로 폐기한다(재발급도 실패하면 백엔드 세션은 refresh 만료까지 남음) |

이 구성을 섞지 않는다 — server-only 코드에 `browserClient`를 쓰거나 브라우저 코드에서 쿠키·토큰을 직접 다루지 않는다. multipart 업로드(가입 프로필, 번치 사진)도 BFF를 거치므로 배포처의 요청 본문 크기 제한을 백엔드 제한(파일 6MB·요청 7MB)과 함께 확인한다.

## BFF 경로

- 일반 요청은 범용 프록시(`src/app/api/[...path]/route.ts`)가 전달한다. BFF 경로는 백엔드 경로에서 `/api/v1`을 뺀 경로다(예: BFF `GET /api/members/nickname-availability` → 백엔드 `GET /api/v1/members/nickname-availability`). 그래서 API를 붙일 때 Route Handler를 새로 만들지 않는다.
- 전용 Route Handler는 인증(쿠키 발급·삭제), 여러 백엔드 응답 조합·가공, 응답에서 민감한 값을 걸러야 할 때만 만들고 `createAuthorizedRoute`·`createServerApi`를 쓴다. 전용 Route Handler가 있는 경로는 프록시보다 우선한다.

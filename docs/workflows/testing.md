# Testing Rules

모바일 앱의 설치·실행과 기기별 수동 확인은 [모바일 앱 실행과 테스트](./mobile-testing.md)를 따른다.

## 도구와 위치

- unit·component test는 Vitest와 Testing Library를 사용한다. React test 환경은 `happy-dom`이다.
- 테스트는 대상 파일 가까이에 `Foo.test.tsx`, `useFoo.test.ts` 형태로 둔다. 공용 setup은 각 앱 루트의 `vitest.setup.ts`에 둔다.
- E2E는 Playwright의 루트 `e2e/`에서 관리한다. 대상은 admin Chromium 흐름(`e2e/admin`)과 web 핵심 흐름 smoke(`e2e/web`, 모바일 크기 Chromium)다. web은 `NEXT_PUBLIC_API_MOCKING=enabled`로 띄운 dev 서버(포트 3200)의 MSW 가짜 서버로 확인하므로 실제 로그인·백엔드 동작은 대상이 아니다. web 프로젝트만 돌리려면 `yarn e2e --project=web-chromium`을 쓴다. 프로젝트를 골라도 `webServer`의 admin(5173)·web(3200) 서버가 모두 뜨므로 두 포트가 비어 있어야 한다.
- web smoke 화면(번치 홈·사진함·마이페이지·개인 프로필 수정·알림 설정)은 `e2e/web/a11y.spec.ts`가 `@axe-core/playwright`로 검사한다. 태그는 WCAG 2.2 A·AA와 best-practice(랜드마크·제목 구조 포함)이고, 화면마다 데이터가 그려진 요소를 기다린 뒤 움직임 줄이기와 글꼴 로드 완료 상태에서 기본 상태 하나만 본다. axe가 자동 판정하는 부분만 확인하므로 키보드 동선·포커스 이동·스크린 리더 읽기, 입력 오류·오버레이 같은 다른 상태는 사람이 확인한다. axe가 판정하지 못한 항목은 테스트 annotation(`axe incomplete`)으로 남긴다.
- 알려진 위반은 흰 배경(#FFFFFF) 위 Figma 보조 글자색 `text-quaternary`(#969AA0)·`text-quinary`(#BCBEC2)의 대비 부족뿐이다(#226에서 디자이너에게 확인 요청). 화면별로 해당 요소 문구(마이페이지 묶음 제목 3개, 개인 프로필 수정 비공개 안내 1개)를 고정해 다른 요소가 같은 색을 쓰거나 색이 고쳐지면 실패하므로, 그때 예외 목록을 갱신하거나 지운다. 새 화면을 smoke에 넣으면 이 목록에도 추가한다. 로그인·가입·온보딩·사진 상세는 아직 대상이 아니다.

`src/test`는 provider render helper, 공통 fixture처럼 반복되는 기반이 실제로 생겼을 때 만든다. 특정 화면의 mock·handler·fixture는 test 가까이에 두고 실제 반복 계약이 확인된 뒤에만 공통화한다.

## 범위

- 테스트는 구현 세부보다 사용자가 관찰할 수 있는 동작을 검증한다.
- 분기·상태 전이가 있는 hook과 form·modal·interaction 컴포넌트는 단위 테스트를 우선 추가하거나 갱신한다.
- 순수 presentational UI는 Storybook 또는 상위 흐름 검증으로 충분한지 먼저 판단한다.
- route, 인증, 여러 화면을 건너는 핵심 흐름은 Playwright E2E 범위를 검토한다.
- DOM 탐색은 role, label, text 순으로 하고 CSS selector는 최후에 사용한다.
- component test는 render → 사용자 interaction → 관찰 가능한 output 순으로 작성한다. 하나의 `it`에는 하나의 핵심 동작을 둔다.
- hook은 input/action → state transition → 공개된 result를 검증한다. UI markup과 style은 hook test의 범위가 아니다.
- API·Query test는 request input, response/error mapping, cache에 보이는 결과 중 하나 이상을 검증한다.

## MSW 가짜 서버

- API 요청 코드(endpoint 함수, query)는 MSW 가짜 서버(`src/mocks/`)로 요청 입력과 응답 매핑을 함께 확인한다. 가짜 서버는 BFF 경로(`/api/…`, 백엔드 경로에서 `/api/v1`을 뺀 경로)를 가로챈다. 화면 test는 기존처럼 endpoint 모듈을 mock해도 된다.
- Vitest: `vitest.setup.ts`가 `server.listen({ onUnhandledFrame: 'error' })`로 켜고, handler가 없는 요청은 test를 실패시킨다. test마다 handler 덮어쓰기(`server.resetHandlers`)·가짜 DB(`mockDb.reset`)·멱등 키가 초기화된다. 한 test에서만 다른 응답이 필요하면 `server.use(http.get(…))`를 쓰고, 오류 응답은 `fail(status, code)`로 만든다.
- 기준 예시는 `features/photo-box/api/bunchMembers.test.ts`(요청 함수)와 `queries/bunchMembers.test.tsx`(query)다.
  - 요청 함수: 가짜 서버 응답의 화면 모양 변환, 오류 code, 한 test만의 응답(`server.use`), 계약 위반(`INVALID_RESPONSE`)을 확인한다. 요청 입력은 handler 안에서 `params`·`request`를 받아 확인한다.
  - query: `src/shared/query/testing.tsx`의 `createQueryWrapper(createTestQueryClient())`로 감싼 `renderHook(() => useQuery(options))`로 성공·오류 상태와 캐시 key를 확인한다. 요청 취소는 `delay('infinite')` handler에서 `request.signal`을 모아 두고 key를 바꾼 뒤 `aborted`를 확인한다. 테스트 client는 앱 설정에서 재시도만 끈 것이다.
  - 쓰기(`features/photo-box/api/photos.test.ts`, `queries/photos.test.tsx`): 요청 함수는 가짜 DB(`mockDb.get()`)가 실제로 바뀌었는지와 실패 때 그대로인지, 보낸 본문(handler 밖 변수에 담아 test 본문에서 단언. handler 안의 `expect`는 실패가 500 응답으로 바뀌어 원인이 가려진다), 오류 status별 `ApiError`(`it.each`)를 확인한다. mutation hook은 캐시에 값을 넣어 둔 client로 `await act(() => mutateAsync(…))` 뒤 `getQueryState(key)?.isInvalidated`가 무효화할 key는 참, 다른 번치·다른 리소스 key는 거짓인지와, 실패 때 `meta.errorMessage` 토스트를 확인한다(호출 여부를 spy하지 않고 캐시 상태를 본다).
  - 요청 함수·query test에서는 endpoint 모듈을 `vi.mock`해 응답 모양을 손으로 만들지 않는다. envelope 해제·스키마 검사·오류 변환을 건너뛰기 때문이다(화면 test는 위처럼 endpoint 모듈을 mock해도 된다).
- 파일: handler는 `src/mocks/handlers/`(백엔드 resource별), 가짜 DB와 시작 데이터는 `src/mocks/db/`, 응답 형식(`ok`·`fail`·`noContent`)과 멱등 키 재생은 `src/mocks/lib/`다. 오류 코드와 메시지는 백엔드 명세를 따르고 명세에 없는 값은 추측하지 않는다.
- 브라우저: `NEXT_PUBLIC_API_MOCKING=enabled`로 빌드·실행하면 서비스 워커(`public/mockServiceWorker.js`, `msw init`으로 생성)가 켜지고 화면은 준비된 뒤에 그려진다. 가짜 DB는 IndexedDB에 남아 새로고침해도 유지된다. 값이 비어 있으면 MSW 코드는 번들에 들어가지 않는다(빌드 뒤 `.next/static`에서 `mockServiceWorker`를 검색해 확인). 운영 배포에서는 이 변수를 설정하지 않는다.
- 서비스 워커는 HTTPS·localhost 브라우저와 홈 화면 앱에서 동작하고, `http://IP` 접속에서는 동작하지 않을 수 있다. 실제 폰·HTTPS 환경은 사용 전에 확인한다.
- MSW 3에서는 처리하지 않은 요청 옵션이 `onUnhandledFrame`이다(2.x의 `onUnhandledRequest`가 아니다).
- happy-dom 한계: ky `afterResponse` hook이 있는 `createBrowserApi`로 본문 없는 204 응답을 받으면 happy-dom이 스트림 오류를 내므로 204 확인은 `fetch`를 쓴다(실제 브라우저는 문제없음).

## Worst-case 데이터

컴포넌트를 데모 데이터로만 확인하면 실제 값에서 깨지는 레이아웃을 놓친다. 폼·목록 컴포넌트를 추가·수정하면 아래 범주 중 관련 있는 것을 최소 하나는 실제로 넣어본다.

| 범주              | 극단값 예시                                              | 흔한 실패                                                         |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| 이름              | 긴 이름+하이픈, 한 글자(`J`), CJK(`王秀英`), 이모지 시작 | 줄바꿈 위치, initials 로직, `.charAt(0)`이 서로게이트 페어를 자름 |
| 이메일·URL·식별자 | 공백 없이 끊어지지 않는 긴 문자열                        | `overflow-wrap` 없으면 형제 요소를 밀어냄                         |
| 라벨·카피         | 번역 시 길어지는 문구, 태그 여러 개                      | 줄바꿈, `+N` overflow 필요                                        |
| 숫자·금액         | 0, 1(복수형), 1,284(천단위 구분), `0.1 + 0.2`            | "0 members", 구분자 누락, 부동소수점 오차 노출                    |
| 목록              | 0개, 1개, 페이지 크기+1, 1,000개+                        | empty state 누락, pagination off-by-one, 가상화 필요              |
| 시간              | 지금, 미래 날짜, 타임존 경계                             | "0초 전" 같은 어색한 상대 시간, UTC·로컬 날짜 차이                |
| 이미지            | 404, 없음, 극단적 종횡비                                 | fallback 부재, 왜곡                                               |
| 상태              | 로딩, 에러, 권한 없음, 본인 항목                         | 원시 에러 메시지 노출, disabled 상태의 레이아웃 붕괴              |

숫자·날짜는 직접 문자열로 조립하지 않고 `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`을 쓴다.

## 격리와 금지 사항

- mock은 네트워크·시간·브라우저 경계에 한정하고, 내부 구현을 과도하게 mock하지 않는다.
- 비동기 UI는 임의의 대기 시간 대신 `findBy*`, `waitFor`처럼 관찰 가능한 완료 조건을 기다린다.
- 직접 바꾼 DOM에 반응하는 코드(`MutationObserver` 등)는 `waitFor`로 기다리지 않는다. `await act(async () => { 변경; await Promise.resolve(); })`로 감지 콜백과 React 갱신을 끝낸 뒤 확인한다.
  - `waitFor`는 전체 테스트를 동시에 돌리는 부하에서 대기 시간을 넘겨 가끔 실패한다.
  - `Promise.resolve()` 한 번으로 충분한 것은 happy-dom이 감지 콜백을 변경 즉시 microtask로 예약하기 때문이다. 테스트 환경을 바꾸면 이 전제를 다시 확인한다.
- web은 동시 실행 부하(pre-push·`yarn verify`)를 고려해 테스트 제한 시간을 15초, `findBy*`·`waitFor` 기본 대기를 3초로 둔다(`apps/web/vitest.config.ts`·`vitest.setup.ts`). 통과하는 테스트는 그대로 빨리 끝난다. 이 값을 늘려 불안정한 테스트를 숨기지 않고, 혼자 돌려도 실패하면 원인을 고친다.
- timer, storage, navigation 같은 경계는 필요한 부분만 mock하고, fake timer 사용 뒤에는 원래 timer로 복원한다.
- 테스트는 로컬 `.env` 값에 의존하지 않는다. 화면·컴포넌트 test는 endpoint 모듈을 mock하고, endpoint 래퍼 test는 transport 함수만 mock한다. 실제 API origin을 test에 적지 않는다(URL 조립 자체를 검증할 때만 예외). env 필수값 검사가 test의 import 경로에서 실행되면 로컬에서는 통과하고 CI에서만 깨진다. 아래 "MSW 가짜 서버"를 쓰는 test는 transport mock 대신 상대 BFF 경로(`/api/…`)를 호출하고 응답은 handler가 정하며, 한 test에서 둘을 섞지 않는다.
- 실패한 테스트를 `skip` 또는 `only`로 숨기지 않는다.
- 외부 라이브러리 내부 동작이나 단순 정적 마크업만을 위한 snapshot 테스트는 피한다.
- 기대값을 구현과 같은 방식으로 다시 계산해서 assert하지 않는다. 기대값은 known-good 값, spec, 예제처럼 구현과 독립된 출처에서 가져온다.
- private 함수 호출, 내부 상태, DB 직접 조회처럼 공개 인터페이스를 우회하는 경로로 검증하지 않는다. 리팩터링으로 동작이 그대로인데 테스트가 깨지면 이 경로를 의심한다.

## 추가할지 판단

| 변경                               | 우선 대상                                                |
| ---------------------------------- | -------------------------------------------------------- |
| 순수 utility·mapper                | 정상·경계·오류 input/output                              |
| form, modal, interactive component | interaction, validation, disabled·error·success          |
| hook·server state                  | state transition, retry·invalidation 등 관찰 가능한 결과 |
| 단순 copy·style만의 변경           | 별도 unit test가 필요한지 판단하고 생략 이유 기록        |
| route·권한·여러 화면 흐름          | Playwright E2E 범위 검토                                 |

테스트가 부족한 리팩터링은 동작을 보존하는 regression test를 먼저 추가한다. coverage 수치만을 목표로 테스트를 늘리지 않는다.

## 기능별 최소 검증 판단표

| 변경                | 확인할 계약                                    | 우선 검증                       |
| ------------------- | ---------------------------------------------- | ------------------------------- |
| route·권한          | 접근 가능 여부, redirect, fallback             | route test 또는 E2E smoke       |
| query               | key에 포함된 parameter, 성공·오류·빈 결과      | hook 또는 component test        |
| mutation            | 요청 payload, 성공 후 cache·UI 갱신, 실패 안내 | hook 또는 component test        |
| form                | validation, 제출 중 비활성화, 서버 오류 복구   | component test, 핵심 흐름은 E2E |
| 공용 component·hook | public props·반환값, 상태 전이, 접근성         | 가까운 unit·component test      |
| utility·mapper      | 정상·경계·잘못된 input                         | unit test                       |
| 버그 수정           | 재현 조건과 수정 후 관찰 결과                  | regression test                 |

fixture와 mock은 대상 test 가까이에 둔다. 둘 이상의 독립된 test에서 같은 계약을 공유할 때만 `src/test`의 공용 기반으로 올린다. 문서만 바꾼 작업은 관련 링크 확인과 `yarn check:agent-docs`를 우선한다.

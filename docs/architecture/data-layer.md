# Data Fetching Rules

- API request·response 계약은 추측하지 않고 구현된 client, 타입, API 문서를 먼저 확인한다.
- transport와 공통 계약은 `@app/api-core`, 앱·도메인별 query와 화면 상태 처리는 각 앱 소스에 둔다.
- 공통 HTTP client는 인증·재시도 같은 transport만 담당한다. endpoint 함수는 앱 또는 feature에 두고, toast·Sentry·화면 알림은 UI 경계에서 처리한다.
- endpoint 함수는 React, TanStack Query, route, toast에 의존하지 않고 HTTP 요청과 앱이 소비할 계약 변환만 담당한다. query hook은 endpoint를 호출하고 cache·enabled·select 정책을, 화면은 사용자 상태 표현을 소유한다.
- OpenAPI 생성 계약은 `packages/api-core/src/generated/openapi.ts`에 둔다. 생성 파일은 endpoint 경계에서만 사용하고 UI에는 필요한 형태로 좁혀 전달한다.
- wire 필드명과 도메인 이름이 다르면(예: `pub_date` → `publishedAt`) raw 타입으로 먼저 받고 endpoint 경계에서 명시적으로 매핑한다. 필드명이 다른 응답을 `as`로 단언하면 타입 체크는 통과해도 값이 런타임에 `undefined`가 되는 버그로 이어진다.
- 모든 endpoint 응답은 zod 스키마로 검사한 뒤 쓴다. 생성 타입은 컴파일 타임 계약일 뿐이라 서버가 실제로 다른 값을 보내도 막지 못한다.
  - 스키마는 feature `model/`에 두고 타입은 `z.infer`로 얻는다. Swagger에 있는 응답은 `schema satisfies z.ZodType<ApiContract<생성 타입>>`(`@app/api-core`)으로 생성 계약과 묶는다.
  - `ApiContract`는 생성 타입의 최상위 선택 필드를 생략과 null 모두 허용하도록 넓힌다. 서버가 둘 중 어느 쪽으로 보낼지 생성 타입만으로는 알 수 없어서다. 선택 필드는 스키마에서 `.nullish()`로 받는다. 중첩 객체의 선택 필드는 넓히지 않으므로, 중첩 응답을 처음 연동할 때 필요하면 넓힌다.
  - 이 검사는 스키마 결과가 계약에 들어맞는지만 보는 단방향 검사다. 필수 필드 누락, 값 타입 오류, 계약에 없는 enum 값은 컴파일에서 잡는다. 계약에 없는 필드 추가, 계약보다 좁은 enum, 빠뜨린 선택 필드는 잡지 못하므로 스키마를 쓸 때 생성 타입과 직접 대조한다. 계약상 선택인 필드를 화면 때문에 필수로 받으면 그 이유를 스키마 주석에 남긴다.
  - Swagger에 아직 없는 응답만 노션 명세로 스키마를 쓰고, 올라오면 같은 방식으로 묶는다.
  - web은 `src/shared/api/bffApi.ts`의 `requestData(request, schema, context)`로 요청한다. envelope 해제, 스키마 검사, 오류 변환을 한곳에서 한다. HTTP 오류·실패 envelope·네트워크 오류·계약 위반은 모두 `ApiError`로 던지고, 계약 위반은 code `INVALID_RESPONSE`(category `validation`, 재시도 없음)다. category `validation`은 4xx 요청 오류에도 쓰이므로 계약 위반은 code로 구분한다. 어느 응답인지와 어긋난 위치는 화면 문구가 아니라 `data`(`context`, `issues`)에 담긴다. 계약 위반을 오류 수집(Sentry)으로 보내는 것은 아직 하지 않았고 후속 과제다.
  - enum은 명세 값만 받는 닫힌 목록으로 둔다. 서버가 새 값을 보내면 화면이 추측하지 않고 계약 위반으로 드러난다.
  - `requestData`는 `data`가 있는 응답 전용이다. 본문 없는 204 응답은 본문을 읽지 않는다. 요청 함수에서 `bffApi.*`를 await하고 오류를 `normalizeError`로 감싼다(로그아웃 `features/my/api/session.ts` 기준). 같은 형태가 반복되면 `shared/api`의 공용 함수로 올린다.
  - 재발급까지 실패한 401은 `ApiError`(category `auth`)로만 전달된다. 로그인 화면으로 보내는 처리(`createBrowserApi`의 `onUnauthorized`)는 아직 없고 로그인 API 연동 때 연결한다.
- TanStack Query query key는 안정적이고 도메인 의미가 드러나야 한다. key는 feature의 `queries/keys.ts` factory 함수만 만들고, queryOptions·hook·무효화 코드는 그 함수를 호출만 한다(배열을 직접 쓰지 않는다). 모든 key는 `{feature}.all`에서 시작해 도메인 이름 함수(`nicknameAvailability(nickname)`, `mine()` → `latestMine()` 등)로 이어지고, 목록·상세 리소스가 있을 때만 `all → lists/list`, `all → details/detail` 계층(`createQueryKeys`)을 쓴다. response 결과를 바꾸는 filter·sort·cursor·id는 모두 key 함수 인자로 받고, 빈 값 제거 같은 정규화도 key 함수에서 한다. 일반 목록과 infinite 목록은 서로 다른 key를 쓰되 같은 prefix 아래에 둔다(예: `list(bunchId)` 아래 `list(bunchId, params)`와 `[...list(bunchId), 'infinite', params]`). 그러면 prefix 하나로 두 목록을 함께 invalidate할 수 있다.
- 일반 `useQuery`, `useSuspenseQuery`, infinite query, route prefetch는 화면의 loading 경계와 navigation 요구에 맞춰 선택한다. 구체적인 선택 기준은 아래 "Query 모드 선택"을 따른다.
- mutation 뒤 캐시 처리는 아래 "Mutation 캐시 동기화" 결정표를 따른다.
- optimistic update는 아래 3단계 계약을 모두 지킬 수 있을 때만 사용한다. 하나라도 근거 없이 생략되면 성공 응답 뒤 갱신을 선택한다.
  1. 요청 전: 같은 query key로 진행 중인 조회를 취소하고, 현재 캐시 값을 스냅샷으로 남긴 뒤 optimistic 값을 적용한다.
  2. 실패 시: 스냅샷으로 롤백하고 사용자에게 실패를 알린다. 롤백 없이 에러만 삼키는 optimistic update는 리뷰에서 반려한다.
  3. 완료 시(성공·실패 무관): 해당 query key를 invalidate해 서버 응답이 최종적으로 화면을 결정하게 한다.
  - 같은 데이터가 일반 목록과 infinite 목록에 함께 캐시돼 있으면 prefix로 `getQueriesData`(스냅샷)·`setQueriesData`(적용)를 하고, 두 캐시 모양(배열과 `pages`)을 모두 처리하는 갱신 함수 하나를 `lib/`에 순수 함수로 둔다.

## 파일 배치 (web)

API 연동 코드는 그 데이터를 쓰는 feature 안에 층별 폴더로 둔다. 폴더는 실제로 쓸 때만 만든다(빈 폴더를 미리 만들지 않는다).

```text
apps/web/src/features/{feature}/
  api/           요청 함수(브라우저 → BFF). 백엔드 리소스 단위 파일
  queries/       keys.ts(key factory), 리소스별 queryOptions·mutation hook
  model/         (필요할 때) 응답 스키마·도메인 타입·변환
  hooks/         화면·흐름 hook(서버 상태 아님)
apps/web/src/shared/query/     QueryClient 설정, 여러 feature가 함께 쓰는 query(승격 시)
apps/web/src/shared/providers/ QueryProvider(앱 공용 provider)
apps/web/src/app/api/[...path]/route.ts   범용 BFF 프록시
apps/web/src/app/api/auth/*                인증 Route Handler(쿠키 발급·삭제)
```

- **`api/`**: HTTP 요청과 계약 변환만 한다. React·TanStack Query·`next/navigation`·디자인 시스템(toast 등)을 import하지 않는다(ESLint 강제). 파일은 백엔드 리소스 단위(`api/nickname.ts`)로 나누고 함수 이름은 네트워크 동사(`get`, `create`, `update`, `remove`)로 시작한다. 경로는 BFF 기준(`/api/…`)이다.
- **`queries/`**: query key, `queryOptions`·`infiniteQueryOptions`, mutation hook을 둔다. `queryOptions`·`useMutation`·`useQueryClient`·`QueryClient`는 `queries/`, `src/shared/query/`, `QueryProvider`에서만 import한다(ESLint 강제, 타입 import는 어디서나 허용). 파일 이름은 `api/`와 맞춘다(`api/nickname.ts` ↔ `queries/nickname.ts`).
- **query hook은 기본으로 만들지 않는다.** 화면이 `useQuery(xxxQueryOptions(…))`처럼 options를 받아 읽는다(`useQuery`·`useSuspenseQuery`·`useInfiniteQuery`는 어디서나 사용 가능). 여러 query 조합이나 가공이 필요할 때만 `queries/`에 `use…Query`를 만든다.
- **mutation은 항상 `queries/`의 `use…Mutation` hook으로 만든다.** 캐시 동기화(아래 "Mutation 캐시 동기화")를 한곳에 모으기 위해서다. 화면 이동·toast 같은 화면 동작은 hook에 넣지 않고 화면이 `mutate(…, { onSuccess })`로 처리한다.
- **mutation 실패 알림은 공통 처리로 선언한다.** mutation에 `meta: { errorMessage }`(사용자 문구)를 주면 QueryClient의 `MutationCache.onError`가 그 문구를 toast로 띄운다. meta 타입은 TanStack Query `Register`로 고정한다. 서버 `error.message`는 문구 키라 그대로 보여 주지 않는다. code마다 다른 문구가 필요하거나 입력 칸 아래에 오류를 보여 주는 화면은 meta 없이 `mutate(…, { onError })`로 직접 처리한다. 성공 toast와 화면 이동은 계속 화면이 맡는다. 구현은 `src/shared/query/queryClient.ts`의 `MutationCache`와 `Register.mutationMeta`다.
- **`hooks/`**: 서버 상태가 아닌 화면·흐름 hook만 둔다.
- 여러 feature가 같은 요청·query를 실제로 함께 쓰고 계약이 안정되면 `src/shared`(`shared/query/`)로 옮긴다. 인증 세션(로그인·재발급·로그아웃)은 모든 BFF가 쓰는 공용 인프라라 처음부터 `src/shared/api/`에 둔다.
- API 연결 전 샘플 데이터는 `fixtures/`에 두고, MSW handler(`src/mocks/`)가 같은 계약으로 응답하게 한다(결정 기록 007). 화면은 요청을 보내는 구조(endpoint 함수 → query)로 만들고, 서버가 준비되면 MSW만 끈다. 서버 ID는 숫자(long)이므로 endpoint 경계에서 `src/shared/api/ids.ts`로 화면 문자열 id로 바꾼다. 요청을 다시 보내도 한 번만 처리돼야 하는 요청(번들 초안 생성·발행)은 `createIdempotencyKey()`로 만든 키를 `Idempotency-Key` 헤더로 보낸다.

### 예시

실제 기준 예시는 사진함의 번치 멤버 목록(조회)과 사진 삭제(쓰기)다. 새 API는 이 파일들을 따라 만든다.

- `features/photo-box/model/bunchMembers.ts`: 응답 zod 스키마와 `toPhotoBoxMember`(숫자 id → 문자열, 쓰는 화면의 기존 타입으로 변환. 화면 타입을 새로 만들지 않는다)
- `features/photo-box/api/bunchMembers.ts`: `requestData`로 요청과 변환. 조회 함수는 마지막 인자로 `signal`을 받아 ky에 넘긴다(mutation은 받지 않음. Query도 mutation에는 signal을 주지 않고, 끊어도 서버 처리는 계속돼 결과만 잃음)
- `features/photo-box/queries/keys.ts`, `queries/bunchMembers.ts`: key factory와 `queryOptions`
- `api/bunchMembers.test.ts`, `queries/bunchMembers.test.tsx`: MSW 가짜 서버로 확인하는 테스트(`docs/workflows/testing.md`)
- 쓰기: `model/photos.ts`(응답 스키마), `api/photos.ts`(`requestData(bffApi.post(…, { json }))`, 화면 id → 서버 숫자), `queries/photos.ts`(`useDeletePhotosMutation`: 실패 문구 `meta`, 성공 뒤 사진 목록 prefix 무효화를 반환), `src/mocks/handlers/photos.ts`(본문 검사와 가짜 DB 변경), 각 test. 사진 목록 query는 아직 없고 #199에서 무효화 prefix `photoBoxKeys.photos(bunchId)` 아래에 추가한다(미리 key를 만들지 않는 규칙의 예외: mutation이 무효화할 prefix)

```ts
// model/bunchMembers.ts — 서버 응답 모양과 화면 모양
const bunchMemberResponseSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string(),
  imageUrl: z.string().nullable(),
  role: z.enum(['OWNER', 'CO_OWNER', 'MEMBER']),
});
export const bunchMembersResponseSchema = z.array(bunchMemberResponseSchema);

// api/bunchMembers.ts — 요청 함수(조회는 Query의 signal을 받아 ky에 넘김)
export const getBunchMembers = async (bunchId: string, signal?: AbortSignal) => {
  const members = await requestData(
    bffApi.get(`bunches/${encodeURIComponent(bunchId)}/members`, { signal: signal ?? null }),
    bunchMembersResponseSchema,
    'bunch members',
  );
  return members.map(toPhotoBoxMember);
};

// queries/keys.ts — key factory
export const photoBoxKeys = {
  all: ['photo-box'] as const,
  members: (bunchId: string | undefined) => [...photoBoxKeys.all, 'members', bunchId] as const,
};

// queries/bunchMembers.ts — queryOptions(입력이 없으면 skipToken으로 요청하지 않음)
export const bunchMembersQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: photoBoxKeys.members(bunchId),
    // 화면 이탈·key 변경 때 Query가 signal로 진행 중 요청을 취소
    queryFn: bunchId ? ({ signal }) => getBunchMembers(bunchId, signal) : skipToken,
  });

// queries/photos.ts — mutation hook(캐시 동기화와 실패 문구만)
export const useDeletePhotosMutation = (bunchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoIds: readonly string[]) => removePhotos(bunchId, photoIds),
    meta: { errorMessage: PHOTO_BOX_MESSAGES.deleteFailed },
    // 반환해서 mutateAsync·isPending이 활성 목록 재요청 완료까지 대기
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photoBoxKeys.photos(bunchId) }),
  });
};

// 화면 — 읽기와 화면 동작
const { data: members, error } = useQuery(bunchMembersQueryOptions(bunchId));
const remove = useDeletePhotosMutation(bunchId);
remove.mutate(selectedIds, {
  // 함께 올린 사진은 남으므로 고른 장수가 아니라 실제로 사라진 장수, 0장이면 토스트 없음
  onSuccess: ({ deletedCount }) => {
    if (deletedCount > 0) toast(PHOTO_BOX_MESSAGES.deleteDone(deletedCount));
  },
});
// 중복 제출은 remove.isPending을 버튼 disabled에 연결해 막는다
```

`bffApi`는 `createBrowserApi()`로 만든 앱 공용 인스턴스이고 `requestData`와 함께 `src/shared/api/bffApi.ts`에 있다. QueryClient는 `src/shared/providers/`의 `QueryProvider`가 `(app)` layout에서 제공한다(그룹 밖 화면이 query를 쓰게 되면 캐시를 나누지 않도록 `QueryProvider`를 root layout으로 올린다). 서버 prefetch를 쓰게 되면 요청 단위 `getQueryClient` 구조로 바꾼다. 조회는 네트워크 오류·5xx만 1회 재시도하고(`createRetryPolicy`), 4xx와 mutation은 재시도하지 않는다.

조회의 기본 `staleTime`은 5분이고, 포커스 갱신(`refetchOnWindowFocus`)은 기본값(켜짐)을 유지한다. 5분 안에 화면이나 앱으로 돌아오면 다시 요청하지 않는다. 5분이 지난 뒤 돌아오면 새로 가져온다. 거의 바뀌지 않는 데이터는 그 `queryOptions`에서 `staleTime`을 늘린다. 다른 사용자의 행동으로 바뀌는 데이터(알림, 팔로우 요청 등)는 줄인다. 전역 기본값은 바꾸지 않는다.

### BFF 경로

일반 요청은 범용 BFF 프록시가 백엔드로 전달하므로 API를 붙일 때 Route Handler를 새로 만들지 않는다. BFF 경로 규칙과 전용 Route Handler를 만드는 기준은 `docs/architecture/api-boundary.md`를 따른다.

## Query 모드 선택

- `useSuspenseQuery`: 데이터 없이는 화면을 의미 있게 그릴 수 없고, route 수준 Suspense fallback으로 충분하며, `enabled`·`placeholderData`·수동 loading 분기가 필요 없고, 한 컴포넌트 안의 독립적인 suspense query가 여러 개라 waterfall이 생기지 않을 때 사용한다.
- `useQuery`: 실행 조건이 있거나, 검색·필터·탭·form 상태가 fetch를 제어하거나, 이전 데이터를 화면에 유지해야 하거나, 화면 일부만 loading·error를 표시하거나, 수동 refetch가 상호작용의 일부이거나, 여러 독립 query를 한 컴포넌트에서 병렬로 시작해야 할 때 사용한다.
- `useInfiniteQuery`: 첫 렌더 이후 추가 페이지를 불러오고 다음 페이지 상태를 화면에서 바로 다뤄야 할 때 사용한다.
- `useSuspenseInfiniteQuery`: 첫 페이지가 route 진입에 필수이고 같은 Suspense fallback이 첫 fetch에도 맞을 때만 사용한다.
- Suspense 계열 query는 `enabled`, `placeholderData`, 커스텀 `throwOnError`를 지원하지 않는다. suspense 데이터는 렌더가 재개된 뒤에만 존재하므로, 응답 필드 자체가 nullable이 아니라면 `data ?? []`처럼 불필요한 방어 코드를 추가하지 않는다.
- 같은 query key를 finite query와 infinite query에 함께 쓰지 않는다.

## 미리 불러오기 (web)

다음 화면의 데이터를 미리 받는 방법은 두 단계로 도입한다. 도입 여부는 `docs/workflows/performance.md`의 "WebView 첫 화면 속도"대로 측정한 뒤 정한다. 지금은 둘 다 구현하지 않았다(설계 단계).

### 1단계: 브라우저에서 미리 받기 (먼저)

- 이동 가능성이 높은 순간(셀을 누르기 시작할 때, 탭이 화면에 뜰 때 등)에 `queryClient.prefetchQuery(xxxQueryOptions(…))`를 부른다. 화면이 쓰는 것과 같은 `queryOptions`를 다시 쓰므로 key·요청·검사가 갈라지지 않는다.
- `queryClient`는 `queries/`에서만 쓸 수 있으므로 미리 받기도 `queries/`의 hook(`usePrefetch…`)으로 만들고 화면은 그 hook만 부른다.
- 요청이 브라우저 → BFF로 나가므로 MSW 가짜 서버와 401 재발급이 그대로 동작한다.
- 이미 받은 데이터가 `staleTime`(5분) 안이면 다시 요청하지 않으므로, 같은 화면을 오가는 곳에서 비용이 작다. 한 화면에서 수십 개를 미리 받는 곳(사진 격자 셀마다 등)에는 쓰지 않는다.

### 2단계: 서버에서 미리 받기와 스트리밍 SSR (실제 서버 연동 뒤)

서버 컴포넌트가 백엔드를 직접 불러 `dehydrate` → `HydrationBoundary`로 브라우저 캐시에 넘긴다. 첫 화면이 데이터와 함께 그려지고, `Suspense` 경계 단위로 준비된 부분부터 보낸다. 도입할 때 아래를 함께 바꾼다.

- MSW는 서버 요청을 가로채지 않는다. 백엔드 연동 전이거나 MSW로 진행하는 UT에서는 서버에서 미리 받기가 동작하지 않으므로, 실제 서버가 준비된 화면에만 쓴다.
- 서버 컴포넌트는 쿠키를 고쳐 쓸 수 없어 access 토큰이 만료돼도 재발급하지 못한다. 서버 쪽 요청이 401이면 미리 받기를 건너뛰고(오류로 렌더를 막지 않음), 브라우저가 평소처럼 받아 재발급 흐름을 탄다.
- `api/` 함수는 마지막 인자로 client를 받게 바꾼다(기본값 `bffApi`). 서버 client는 `createServerApi({ accessToken, baseUrl: API_BASE_URL + 'api/v1/' })`로 만들어 BFF와 같은 상대 경로(`bunches/1/members`)를 쓰게 하고, zod 검사와 화면 모양 변환은 그대로 다시 쓴다. 그래서 `api/` 함수의 경로는 지금처럼 BFF 기준 상대 경로로 쓰고, 전체 URL이나 `/api/` 접두사를 직접 넣지 않는다.
- QueryClient는 서버에서 요청마다 새로 만들고 브라우저에서는 하나를 유지하는 `getQueryClient` 구조로 바꾼다(위 `QueryProvider` 설명).
- 서버에서 받은 데이터도 `staleTime` 안에서는 브라우저가 다시 요청하지 않는다. 서버와 브라우저가 같은 요청을 중복 소유하지 않게 한 화면의 같은 데이터는 한쪽에서만 미리 받는다(`docs/architecture/routing-and-access.md`).

## 캐시 영속화 (web)

앱을 다시 열면 지난 서버 상태를 먼저 보이고, 오래된 값은 뒤에서 다시 받는다. WebView 첫 화면이 요청을 모두 기다리지 않게 하려는 것이다(`docs/workflows/performance.md` 「WebView 첫 화면 속도」). 구현은 `src/shared/query/persistence.ts`와 `QueryProvider`(`PersistQueryClientProvider`)가 맡는다.

- 저장은 query마다 정한다. `queryOptions`에 `...persistedQuery`(`meta: { persist: true }`와 `gcTime` 24시간)를 펼친 query만, 데이터를 받은 상태일 때 localStorage에 남긴다. 메모리에서 지워진 query는 저장본에서도 빠져서 `gcTime`을 저장 기간만큼 늘린다. 표시가 없으면 메모리에만 있다.
- 저장하는 것: 앱을 열자마자 보이는 화면의 데이터(지금은 번치 홈 프로필·완성된 번들·작성 중인 번들, 번치 전환 목록, 번치 멤버).
- 저장하지 않는 것:
  - 로그인·가입 상태(`sharedKeys.session()`). 접근 판단은 항상 서버 응답으로 한다. 저장하면 로그아웃한 기기에 이전 사용자의 화면이 잠깐 보일 수 있다.
  - 어느 번치를 볼지 정하는 값(`members/me`의 기본 번치). 저장본이 오래되면 이전 번치 홈이 먼저 보였다가 바뀐다. 이 값만 서버에서 받고, 받은 번치의 홈 데이터는 저장본으로 바로 그린다.
  - 편집 중이거나 동시 편집 대상인 데이터(번들 작성, 편집권).
  - 사진 원본 상세처럼 크거나, 오래 두면 의미가 바뀌는 데이터.
  - 한 번 보고 마는 화면의 데이터.
- 복원한 값은 받은 시각을 그대로 가져서, `staleTime`(5분)이 지났으면 화면에 보인 뒤 바로 다시 받는다. 화면은 복원 값과 새 값의 차이를 따로 다루지 않는다.
- 저장본은 24시간이 지나거나 빌드가 바뀌면(`NEXT_PUBLIC_APP_BUILD`) 버린다. 가짜 서버 여부(`NEXT_PUBLIC_API_MOCKING`)가 다를 때도 버린다. 저장하는 query의 응답 모양을 바꾸면 배포가 바뀌므로 따로 할 일은 없다. 개발 서버는 켤 때마다 버린다.
- 저장 키는 처음 연 화면의 첫 경로 조각(`bunch`·`feed`·`photos`·`my`, 앱 쉘 첫 화면 `/`는 빈 값)별로 나눈다. 앱 쉘의 탭 WebView 4개가 같은 origin이라, 한 키를 쓰면 각자 가진 query만으로 서로 덮어쓴다.
- 저장본에는 저장한 순간의 회원 ID를 함께 적는다. 회원이 확인되기 전에는 저장하지 않는다. `AuthGate`는 서버가 확인한 회원과 복원한 저장본의 회원이 다르거나(주인 표시가 없는 저장본 포함), 같은 화면에서 회원이 바뀌면 저장 대상 query와 모든 저장본을 지운 뒤에 화면을 그린다. 같은 origin의 다른 탭·WebView가 이전 사용자 데이터를 다시 써도 다음 사용자에게 복원되지 않게 하려는 것이다.
- 로그아웃·탈퇴에 성공하면 모든 저장본을 지운다. 비로그인이 확인될 때(`AuthGate`)도 저장 대상 query와 모든 저장본을 지운다. 세션 만료와, 로그아웃 직후 앱이 종료된 경우가 여기를 지난다.
- 번치 전환은 저장해 둔 값이 있어도 새 번치 홈을 서버에서 다시 받은 뒤 바꾼다.
- 테스트는 `createQueryWrapper`(영속화 없음)로 렌더한다. 저장 규칙 자체는 `persistence.test.ts`가 확인한다.

## Mutation 캐시 동기화

| mutation 결과와 화면 흐름                           | 캐시 처리                                                   |
| --------------------------------------------------- | ----------------------------------------------------------- |
| 완전한 최신 entity가 반환되고 즉시 화면에 보여야 함 | 해당 detail key에 `setQueryData`                            |
| 저장에 성공하고 목록·다른 화면으로 이동함           | 이동할 화면이 읽는 query를 `invalidateQueries`              |
| 생성·삭제로 목록 순서·구성·개수·집계가 바뀜         | 영향받는 prefix를 `invalidateQueries`                       |
| 응답이 부분적이거나 서버 계산 필드를 알 수 없음     | entity를 추측해 만들지 않고 `invalidateQueries`             |
| 완전한 detail은 반환되지만 목록·개수도 함께 바뀜    | detail은 `setQueryData`, 목록·개수 prefix는 함께 invalidate |

- mutation endpoint 함수는 TanStack Query를 import하지 않는다. cache 동기화는 `queryClient`와 UI 부수효과에 접근 가능한 mutation hook이 담당한다.
- route가 바뀌어도 TanStack Query cache는 지워지지 않는다. 다시 마운트된 query가 다시 fetch되는 이유는 remount 자체가 아니라 invalidate가 stale로 표시했기 때문이다.
- `setQueryData`는 정확히 하나의 key만 갱신한다. 그 key가 다른 child key의 prefix이기도 하면 `exact: true`를 지정하거나, child도 함께 stale해질 때는 child prefix를 명시적으로 invalidate한다.
- 화면이 mutation을 완료로 취급하기 전에 refetch가 시작돼야 하면 invalidate를 `await`한다.
- mutation 직후 navigate하고 목적지의 loader·guard가 그 cache를 읽는다면, navigate 전에 `setQueryData`로 값을 확정하거나 invalidate를 `await`한다. 구독자가 없는 query는 invalidate가 stale 표시만 하고, fire-and-forget이면 loader가 갱신 전 cache를 읽어 이전 화면으로 되돌려 보내는 레이스가 생긴다(다른 프로젝트에서 WebKit E2E에서만 재현된 사례).
- 한 mutation이 여러 key를 함께 무효화해야 하면(예: 번들 발행 뒤 초안 목록과 번치 홈 번들 목록·개수) 무효화를 함수 하나로 묶어 mutation hook과 다른 화면이 같은 범위를 쓰게 한다. 같은 feature의 key만 다루면 그 feature의 `queries/`에, 다른 feature의 key까지 다루면 feature 내부를 서로 import하지 않도록 `src/shared/query/`에 둔다.
- 아직 소유하는 query가 없는 데이터를 위해 미리 query key나 cache 항목을 만들지 않는다.
- 일반적인 mutation 성공 처리에는 `resetQueries`, `removeQueries`를 사용하지 않는다.
- 서버 상태를 local state 또는 전역 store에 불필요하게 복제하지 않는다.
- loading, background loading, empty, error, disabled, success 상태는 화면의 책임 범위에서 빠뜨리지 않는다. retry 가능 여부와 사용자에게 보이는 오류 안내도 계약으로 취급한다.
- web에서는 server-only 경계와 browser client를 분리한다. cookie·secret을 client bundle로 보내지 않는다.
- admin에서는 route loader와 component query의 책임을 섞지 않고, 필요한 경우 route 수준에서 prefetch한다.
- 여러 app에서 같은 transport·생성 타입을 써도 endpoint와 query hook은 제품 의미가 같고 안정된 API일 때만 shared package로 승격한다. 공통화 전에는 각 app·feature 가까이에 둔다.

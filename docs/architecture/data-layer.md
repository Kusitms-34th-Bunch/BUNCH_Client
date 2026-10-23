# Data Fetching Rules

- API request·response 계약은 추측하지 않고 구현된 client, 타입, API 문서를 먼저 확인한다.
- transport와 공통 계약은 `@app/api-core`, 앱·도메인별 query와 화면 상태 처리는 각 앱 소스에 둔다.
- 공통 HTTP client는 인증·재시도 같은 transport만 담당한다. endpoint 함수는 앱 또는 feature에 두고, toast·Sentry·화면 알림은 UI 경계에서 처리한다.
- endpoint 함수는 React, TanStack Query, route, toast에 의존하지 않고 HTTP 요청과 앱이 소비할 계약 변환만 담당한다. query hook은 endpoint를 호출하고 cache·enabled·select 정책을, 화면은 사용자 상태 표현을 소유한다.
- OpenAPI 생성 계약은 `packages/api-core/src/generated/openapi.ts`에 둔다. 생성 파일은 endpoint 경계에서만 사용하고 UI에는 필요한 형태로 좁혀 전달한다.
- wire 필드명과 도메인 이름이 다르면(예: `pub_date` → `publishedAt`) raw 타입으로 먼저 받고 endpoint 경계에서 명시적으로 매핑한다. 필드명이 다른 응답을 `as`로 단언하면 타입 체크는 통과해도 값이 런타임에 `undefined`가 되는 버그로 이어진다.
- OpenAPI 생성 타입은 컴파일 타임 계약일 뿐 런타임 값을 보장하지 않는다. 신뢰할 수 없거나 틀리면 위험한 응답(결제, 권한, 외부 연동 응답)은 `@app/api-core`의 `parseResponse(schema, data)`로 zod 검증을 거친 뒤 사용한다. `parseResponse`는 실패 시 `undefined`를 반환하고 `onValidationError` 훅으로 알리므로, 호출부는 실패를 성공처럼 다루지 않고 명시적으로 처리한다.
- TanStack Query query key는 안정적이고 도메인 의미가 드러나야 한다. key는 feature의 `queries/keys.ts` factory 함수만 만들고, queryOptions·hook·무효화 코드는 그 함수를 호출만 한다(배열을 직접 쓰지 않는다). 모든 key는 `{feature}.all`에서 시작해 도메인 이름 함수(`nicknameAvailability(nickname)`, `mine()` → `latestMine()` 등)로 이어지고, 목록·상세 리소스가 있을 때만 `all → lists/list`, `all → details/detail` 계층(`createQueryKeys`)을 쓴다. response 결과를 바꾸는 filter·sort·cursor·id는 모두 key 함수 인자로 받고, 빈 값 제거 같은 정규화도 key 함수에서 한다. 일반 목록과 infinite 목록은 서로 다른 key를 쓴다.
- 일반 `useQuery`, `useSuspenseQuery`, infinite query, route prefetch는 화면의 loading 경계와 navigation 요구에 맞춰 선택한다. 구체적인 선택 기준은 아래 "Query 모드 선택"을 따른다.
- mutation 뒤 캐시 처리는 아래 "Mutation 캐시 동기화" 결정표를 따른다.
- optimistic update는 아래 3단계 계약을 모두 지킬 수 있을 때만 사용한다. 하나라도 근거 없이 생략되면 성공 응답 뒤 갱신을 선택한다.
  1. 요청 전: 같은 query key로 진행 중인 조회를 취소하고, 현재 캐시 값을 스냅샷으로 남긴 뒤 optimistic 값을 적용한다.
  2. 실패 시: 스냅샷으로 롤백하고 사용자에게 실패를 알린다. 롤백 없이 에러만 삼키는 optimistic update는 리뷰에서 반려한다.
  3. 완료 시(성공·실패 무관): 해당 query key를 invalidate해 서버 응답이 최종적으로 화면을 결정하게 한다.

## 파일 배치 (web)

API 연동 코드는 그 데이터를 쓰는 feature 안에 층별 폴더로 둔다. 폴더는 실제로 쓸 때만 만든다(빈 폴더를 미리 만들지 않는다).

```text
apps/web/src/features/{feature}/
  api/           요청 함수(브라우저 → BFF). 백엔드 리소스 단위 파일
  queries/       keys.ts(key factory), 리소스별 queryOptions·mutation hook
  model/         (필요할 때) 응답 스키마·도메인 타입·변환
  hooks/         화면·흐름 hook(서버 상태 아님)
apps/web/src/shared/query/     QueryClient·Provider, 여러 feature가 함께 쓰는 query(승격 시)
apps/web/src/app/api/[...path]/route.ts   범용 BFF 프록시
apps/web/src/app/api/auth/*                인증 Route Handler(쿠키 발급·삭제)
```

- **`api/`**: HTTP 요청과 계약 변환만 한다. React·TanStack Query·`next/navigation`·디자인 시스템(toast 등)을 import하지 않는다(ESLint 강제). 파일은 백엔드 리소스 단위(`api/nickname.ts`)로 나누고 함수 이름은 네트워크 동사(`get`, `create`, `update`, `remove`)로 시작한다. 경로는 BFF 기준(`/api/…`)이다.
- **`queries/`**: query key, `queryOptions`·`infiniteQueryOptions`, mutation hook을 둔다. `queryOptions`·`useMutation`·`useQueryClient`·`QueryClient`는 `queries/`와 `src/shared/query/`에서만 import한다(ESLint 강제). 파일 이름은 `api/`와 맞춘다(`api/nickname.ts` ↔ `queries/nickname.ts`).
- **query hook은 기본으로 만들지 않는다.** 화면이 `useQuery(xxxQueryOptions(…))`처럼 options를 받아 읽는다(`useQuery`·`useSuspenseQuery`·`useInfiniteQuery`는 어디서나 사용 가능). 여러 query 조합이나 가공이 필요할 때만 `queries/`에 `use…Query`를 만든다.
- **mutation은 항상 `queries/`의 `use…Mutation` hook으로 만든다.** 캐시 동기화(아래 "Mutation 캐시 동기화")를 한곳에 모으기 위해서다. 화면 이동·toast 같은 화면 동작은 hook에 넣지 않고 화면이 `mutate(…, { onSuccess })`로 처리한다.
- **`hooks/`**: 서버 상태가 아닌 화면·흐름 hook만 둔다.
- 여러 feature가 같은 요청·query를 실제로 함께 쓰고 계약이 안정되면 `src/shared`(`shared/query/`)로 옮긴다. 인증 세션(로그인·재발급·로그아웃)은 모든 BFF가 쓰는 공용 인프라라 처음부터 `src/shared/api/`에 둔다.
- API 연결 전 샘플 데이터는 `fixtures/`에 두고, MSW를 도입하면(결정 기록 007) handler가 같은 fixture를 재사용한다.

### 예시

```ts
// features/auth/api/nickname.ts — 요청 함수
export const getNicknameAvailability = (nickname: string) =>
  bffApi
    .get('members/nickname-availability', { searchParams: { nickname } })
    .json()
    .then(unwrapEnvelope<boolean>);

// features/auth/queries/keys.ts — key factory
export const authKeys = {
  all: ['auth'] as const,
  nicknameAvailability: (nickname: string) =>
    [...authKeys.all, 'nickname-availability', nickname] as const,
  onboarding: () => [...authKeys.all, 'onboarding'] as const,
};

// features/auth/queries/nickname.ts — queryOptions
export const nicknameAvailabilityQueryOptions = (nickname: string) =>
  queryOptions({
    queryKey: authKeys.nicknameAvailability(nickname),
    queryFn: () => getNicknameAvailability(nickname),
    enabled: nickname.length > 0,
  });

// features/auth/queries/profile.ts — mutation hook(캐시 동기화만)
export const useRegisterProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.onboarding() }),
  });
};

// 화면 — 읽기와 화면 동작
const { data: available } = useQuery(nicknameAvailabilityQueryOptions(nickname));
register.mutate(form, { onSuccess: () => router.push(nextPath) });
```

`bffApi`는 `createBrowserApi()`로 만든 앱 공용 인스턴스다(첫 API 연동 때 `src/shared/api`에 둔다).

### BFF 경로

일반 요청은 범용 BFF 프록시가 백엔드로 전달하므로 API를 붙일 때 Route Handler를 새로 만들지 않는다. BFF 경로 규칙과 전용 Route Handler를 만드는 기준은 `docs/architecture/api-boundary.md`를 따른다.

## Query 모드 선택

- `useSuspenseQuery`: 데이터 없이는 화면을 의미 있게 그릴 수 없고, route 수준 Suspense fallback으로 충분하며, `enabled`·`placeholderData`·수동 loading 분기가 필요 없고, 한 컴포넌트 안의 독립적인 suspense query가 여러 개라 waterfall이 생기지 않을 때 사용한다.
- `useQuery`: 실행 조건이 있거나, 검색·필터·탭·form 상태가 fetch를 제어하거나, 이전 데이터를 화면에 유지해야 하거나, 화면 일부만 loading·error를 표시하거나, 수동 refetch가 상호작용의 일부이거나, 여러 독립 query를 한 컴포넌트에서 병렬로 시작해야 할 때 사용한다.
- `useInfiniteQuery`: 첫 렌더 이후 추가 페이지를 불러오고 다음 페이지 상태를 화면에서 바로 다뤄야 할 때 사용한다.
- `useSuspenseInfiniteQuery`: 첫 페이지가 route 진입에 필수이고 같은 Suspense fallback이 첫 fetch에도 맞을 때만 사용한다.
- Suspense 계열 query는 `enabled`, `placeholderData`, 커스텀 `throwOnError`를 지원하지 않는다. suspense 데이터는 렌더가 재개된 뒤에만 존재하므로, 응답 필드 자체가 nullable이 아니라면 `data ?? []`처럼 불필요한 방어 코드를 추가하지 않는다.
- 같은 query key를 finite query와 infinite query에 함께 쓰지 않는다.

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
- 아직 소유하는 query가 없는 데이터를 위해 미리 query key나 cache 항목을 만들지 않는다.
- 일반적인 mutation 성공 처리에는 `resetQueries`, `removeQueries`를 사용하지 않는다.
- 서버 상태를 local state 또는 전역 store에 불필요하게 복제하지 않는다.
- loading, background loading, empty, error, disabled, success 상태는 화면의 책임 범위에서 빠뜨리지 않는다. retry 가능 여부와 사용자에게 보이는 오류 안내도 계약으로 취급한다.
- web에서는 server-only 경계와 browser client를 분리한다. cookie·secret을 client bundle로 보내지 않는다.
- admin에서는 route loader와 component query의 책임을 섞지 않고, 필요한 경우 route 수준에서 prefetch한다.
- 여러 app에서 같은 transport·생성 타입을 써도 endpoint와 query hook은 제품 의미가 같고 안정된 API일 때만 shared package로 승격한다. 공통화 전에는 각 app·feature 가까이에 둔다.

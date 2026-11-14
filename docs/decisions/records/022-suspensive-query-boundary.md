# 022: 데이터 없이 그릴 수 없는 화면의 받는 중·실패는 Suspensive 경계로 모은다

- 상태: accepted
- 기록일: 2026-11-15
- 구현 상태(2026-11-15 확인): 일부 구현(#373). `apps/web/src/shared/components/boundary/QueryBoundary.tsx`, 첫 적용 화면은 팔로우 요청(`features/bunch-home/components/follows/FollowRequests.tsx`). 나머지 화면 전환은 후속 이슈.

## 배경과 결정

전체 화면 받는 중(`PageLoading`)을 직접 그리는 곳이 38곳, 실패하면 직접 `refetch`하는 다시 시도가 20곳이었다. 화면마다 `isPending`·`isError && !data`·어느 query를 다시 받을지를 반복했다.

데이터 없이는 화면을 그릴 수 없는 화면은 `useSuspenseQuery`로 읽고, 받는 중·실패·다시 시도는 앱 공용 `QueryBoundary` 하나가 맡는다. 경계는 `@suspensive/react`의 `ErrorBoundary`와 `Suspense`로 만든다.

- 서버 렌더에서는 받는 중만 그린다(`Suspense clientOnly`). 이 화면들은 서버에서도 그려지는 클라이언트 컴포넌트라, 그대로 두면 브라우저 전용 BFF 요청을 서버 렌더 중에 보낸다.
- 다시 시도는 `ErrorBoundary`의 `reset`과 TanStack Query의 `QueryErrorResetBoundary`로 실패한 query만 다시 받는다.
- 실패는 데이터가 없을 때만 경계로 간다(TanStack Query v5 `useSuspenseQuery` 기본값). 이미 받은 데이터가 있으면 다시 받기가 실패해도 보던 내용을 유지한다.
- 경계는 API 오류(`ApiError`, 네트워크·계약 위반 포함)만 잡는다(`shouldCatch`). 렌더 버그는 위로 올려 `global-error`의 오류 수집까지 가게 한다.
- 다시 시도 표시는 경계마다 `QueryErrorResetBoundary`로 좁힌다. 다시 시도하면 실패 화면이 받는 중으로 바뀌어 버튼이 사라지므로, 초점은 경계를 감싼 영역(`tabIndex=-1`)에 둔다.
- 받는 중 안내는 경계 안의 늘 있는 상태 영역(`role="status"`)에 받는 중인 동안만 글자를 넣어 읽힌다(새로 끼워 넣은 live region은 읽히지 않는 경우가 많음).
- 앞 결과에 기대는 query(내 정보 → 번치 → 목록)는 컴포넌트를 나눠 차례로 읽는다. 원래 차례로 받던 화면만 옮겨 새 대기를 만들지 않는다.

## 대안과 재검토 조건

- `useQuery` 유지(화면마다 분기): 실행 조건(`skipToken`·`enabled`)이 있거나, 화면 일부만 받는 중을 보이거나, 다시 받기 실패 뒤에도 내용을 유지해야 하는 곳은 그대로 쓴다(`docs/architecture/data-layer.md` 「Query 모드 선택」).
- React 기본 `Suspense`와 직접 만든 오류 경계: 서버 렌더 제외(`clientOnly`)와 `reset`을 직접 만들어야 한다.
- `@suspensive/react-query`: 기본 패키지는 설치 스크립트로 TanStack Query v4·v5용을 고르는데, 이 저장소는 build script를 꺼 두어 v4용(`@suspensive/react-query-4`)이 붙는다(2026-11-15 확인). `<SuspenseQuery>` 같은 컴포넌트가 필요해지면 v5 전용 `@suspensive/react-query-5`를 직접 쓴다. 지금은 `useSuspenseQuery`를 TanStack Query에서 쓰므로 넣지 않았다.
- 경계 실패 안내의 초점·낭독 처리가 화면마다 달라 공용 경계로 맞추기 어려워지거나, Suspensive가 React·Next 새 버전을 따라오지 못하면 다시 검토한다.
- 경계가 잡은 API 오류는 Next(`onCaughtError`)가 운영에서도 브라우저 콘솔에 남긴다(본인 응답이라 경계 위반은 아님, `useQuery` 분기 때는 남지 않았음). Sentry는 console을 수집하지 않고 breadcrumb도 지우므로 보내지 않는다. Sentry에 console 수집·breadcrumb을 켜면 이 경로를 다시 본다.
- `isApiError`는 `requestData` 안의 모든 오류(계약 위반 등 `category: 'unknown'` 포함)를 잡는다. 예전 `isError` 분기와 같은 범위다. 계약 위반을 따로 수집할지는 별도 결정이다.

## 검증

- `@suspensive/react` 3.21.4, peer `react ^18 || ^19`(저장소 React 19). Yarn PnP에서 설치 스크립트 없이 동작.
- 팔로우 요청: 받기 실패 뒤 다시 시도 테스트 추가, 기존 승인·거절·빈 상태·번치 없음 테스트 통과(`BunchFollows.test.tsx`).
- 경계가 잡은 오류를 React가 `console.error`로 남길 때 테스트 환경(happy-dom)이 오류 객체를 문자열로 바꾸다 실패해 Vitest가 처리되지 않은 오류로 센다. 경계 실패를 시험하는 테스트는 `console.error`를 막는다.

---
name: integrate-api
description: 이 저장소의 데이터 계층 기준으로 API endpoint, TanStack Query hook, mutation, 서버 상태 UI를 구현한다. API 요청, query key, cache 갱신 작업에 사용한다.
---

# API·TanStack Query 연동

## 목적과 경계

이미 확정된 API 계약을 호출 가능한 endpoint, 예측 가능한 server state, 화면 상태로 연결한다.
새 endpoint 계약을 설계하거나 OpenAPI 생성 설정을 바꾸는 작업은 각각 `configure-openapi-types`와 관련 decision 문서로 분리한다.

## 입력 점검

### 필수

- 대상 앱·route 또는 feature와 호출 화면
- HTTP method, path, path/search/body input
- 성공 response shape와 최소 한 가지 실패 조건

### 필요하면 확인

- OpenAPI source 또는 승인된 API 문서
- 인증 방식, pagination 또는 cursor, retry 조건
- mutation 뒤 영향받는 list, detail, infinite list
- 성공 후 redirect·toast·form reset 같은 UI 동작

계약, 소유자, response-changing parameter, mutation 후 cache 동작 중 하나라도 불명확하면 임의로 구현을 고정하지 않고 확인 필요 항목으로 남긴다.

## 읽기 순서

1. `docs/architecture/data-layer.md`, `docs/workflows/api-integration.md`, `.agents/guides/api-integration.md`
2. 대상 app의 `AGENTS.md`, 가까운 endpoint·query key·hook·UI·test
3. 필요할 때 `packages/api-core/src`와 생성 OpenAPI 타입
4. route·feature가 문서화되어 있으면 가까운 `*.spec.md`

## 소유와 파일 배치

가장 작은 현재 소유 경계에서 시작한다.

| 상황                                                | 배치                                          |
| --------------------------------------------------- | --------------------------------------------- |
| 한 route에서만 쓰는 흐름                            | 해당 route 또는 page 가까이                   |
| 여러 route가 같은 사용자 작업을 공유                | 해당 feature/domain                           |
| transport, 인증, 공통 error normalizing             | `packages/api-core`                           |
| 두 app에 같은 UI 없이 같은 endpoint flow가 재사용됨 | 실제 consumer를 확인한 뒤 shared package 검토 |

- endpoint는 네트워크 동사(`get`, `create`, `update`, `remove`)로 이름 짓는다.
- endpoint는 React·TanStack Query·toast·route를 import하지 않는다.
- page hook은 query/mutation을 조합할 수 있지만 raw request를 직접 호출하지 않는다.
- generated OpenAPI의 `paths`, `components` 타입은 boundary alias·adapter 뒤에 두며 UI가 직접 import하지 않는다.

## 구현 순서

1. 계약 표를 작성한다: endpoint, input, output, 오류, 호출 위치, cache 영향.
2. endpoint function과 request/response boundary type을 만든다.
3. query key factory를 먼저 정의한다. key에는 모든 response-changing parameter를 넣고 finite와 infinite key를 구분한다.
4. GET은 query hook, 생성·수정·삭제는 mutation hook으로 구현한다. query mode는 suspense 여부, 초기 data, pagination에 근거해 선택한다.
5. mutation마다 아래 중 필요한 최소 cache 동작 하나를 명시한다.

| 상황                                              | 기본 선택                                  |
| ------------------------------------------------- | ------------------------------------------ |
| 결과를 안전하게 다시 받아야 함                    | 관련 key `invalidateQueries`               |
| 서버 response로 현재 detail을 즉시 교체할 수 있음 | `setQueryData` 후 필요한 list invalidation |
| 즉각 반응이 제품 요구로 확정됨                    | rollback을 포함한 optimistic update        |

6. retry는 transient network failure에만 근거를 두며 auth·validation 오류에는 적용하지 않는다.
7. 화면에서 loading, error, empty, pending, success와 duplicate submit을 처리한다. endpoint error는 조용히 삼키지 않는다.
8. 문서화된 page라면 Data Dependencies, mutation 영향, verification 항목을 업데이트한다.

## Query key 규칙

```ts
export const memberQueryKeys = {
  all: ['members'] as const,
  lists: () => [...memberQueryKeys.all, 'list'] as const,
  list: (filters: MemberFilters) => [...memberQueryKeys.lists(), filters] as const,
  details: () => [...memberQueryKeys.all, 'detail'] as const,
  detail: (memberId: string) => [...memberQueryKeys.details(), memberId] as const,
  infinite: (filters: MemberFilters) => [...memberQueryKeys.all, 'infinite', filters] as const,
};
```

- inline array key는 동일 key의 defaults·invalidation·여러 hook에서 공유될 때 사용하지 않는다.
- filter object는 stable하게 구성하며 response를 바꾸는 filter, sort, cursor mode를 빠뜨리지 않는다.
- infinite query의 page parameter는 key가 아니라 query function과 pagination state로 처리한다.

## UI 상태 기준

| 상태    | 최소 동작                                         |
| ------- | ------------------------------------------------- |
| loading | 최초 진입의 대기 표현, 기존 data 유지 여부 명확화 |
| error   | 재시도 가능성, 사용자 메시지, 인증·권한 분기      |
| empty   | 정상적으로 데이터가 없다는 안내와 다음 action     |
| pending | mutation 중복 실행 방지와 진행 상태               |
| success | 캐시·화면·redirect/reset의 일관된 반영            |

## 완료 기준

- 계약과 endpoint, type, hook, key, UI 상태의 연결이 추적 가능하다.
- 모든 response-changing parameter가 key에 포함되고 mutation cache 영향이 명확하다.
- transport와 UI, generated type과 view model의 경계가 분리되어 있다.
- 관련 unit/component test와 범위에 맞는 `yarn lint`, `yarn typecheck`, 대상 test/build가 실행됐거나 미실행 이유가 기록됐다.

## 출력

다음 순서로 보고한다.

1. 계약과 소유 위치
2. query key 구조와 query mode
3. mutation cache 처리와 UI 상태
4. 변경 파일, 실행한 검증, 미실행 검증과 이유

`any`, secret·base URL hardcode, 오류 삼키기, 계약 추측, 실제 재사용 없는 shared package 이동은 하지 않는다.

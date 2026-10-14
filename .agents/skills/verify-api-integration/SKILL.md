---
name: verify-api-integration
description: 변경된 API client, TanStack Query hook, mutation, query key, cache 동작과 서버 상태 UI를 감사한다. API 연동 뒤 또는 리뷰 전에 사용한다.
---

# API 연동 검증

## 범위와 입력

- `docs/architecture/data-layer.md`, `docs/workflows/api-integration.md`, 변경된 endpoint·key·hook·UI·test를 읽는다.
- HTTP contract와 API 문서가 있으면 method/path/input/output/error를 대조한다.
- 계약 또는 backend 동작을 알 수 없으면 `확인 필요`로 보고하며 통과로 가정하지 않는다.

## 감사 순서

### API boundary

- transport가 React, route, toast 같은 UI 의존성을 import하지 않는다.
- generated OpenAPI type은 boundary alias·adapter로 제한하고 view component에 직접 노출하지 않는다.
- `any`, 무근거 assertion, secret/base URL hardcode, error swallowing이 없는지 확인한다.

### Query key와 query mode

- factory가 list/detail/infinite hierarchy를 표현하는지 확인한다.
- response-changing filter, sort, identifier, mode가 key에 들어가는지 확인한다.
- finite와 infinite query의 key·cache를 섞지 않는지, pagination parameter 처리가 계약에 맞는지 확인한다.
- suspense, initial data, enabled condition, retry가 화면 UX와 오류 조건에 맞는지 확인한다.

### Mutation과 cache

- mutation이 영향을 주는 list/detail/infinite data를 열거하고 invalidation·setQueryData·optimistic update 중 선택 이유가 있는지 확인한다.
- optimistic update에는 cancel, snapshot, rollback, settled 처리의 필요성을 점검한다.
- pending 상태가 double submit과 navigation race를 막는지 확인한다.

### 화면과 검증

- loading, error, empty, pending, success, auth/permission state가 화면에 드러나는지 확인한다.
- query key와 invalidation의 핵심 동작을 test하거나, backend 의존 때문에 수동 검증이 필요함을 명시한다.
- page spec과 docs가 API 의존성 변화에 맞게 갱신됐는지 확인한다.

## 출력

| 항목 | 상태 | 근거 |
| ---- | ---- | ---- |

실패와 확인 필요 항목은 `파일:줄`, 영향, 최소 수정, 재검증 command를 포함한다. 검증 단계에서 파일을 수정하지 않는다.

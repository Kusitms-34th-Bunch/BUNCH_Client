---
name: configure-openapi-types
description: 생성 API 계약이 UI 코드에 새지 않도록 OpenAPI schema 기반 TypeScript type 생성을 추가하거나 수정한다. 승인된 OpenAPI source와 type generation 설정 작업에 사용한다.
---

# OpenAPI 타입 생성

## 먼저 확인

- `docs/architecture/data-layer.md`, `docs/workflows/api-integration.md`, `scripts/generate-openapi-types.mjs`, `packages/api-core`를 읽는다.
- schema source가 raw OpenAPI JSON/YAML URL 또는 확인 가능한 로컬 파일인지, 생성 output과 consumer 경계가 정해졌는지 확인한다.

## 진행

1. schema URL·경로는 `.env.local` 또는 `.env.openapi.local`의 `OPENAPI_SCHEMA_URL`에서 읽고 secret를 repository에 기록하지 않는다.
2. 생성 파일은 사람이 직접 수정하지 않는 위치에 두고, API boundary에서 의미 있는 alias·adapter를 통해 consumer로 전달한다.
3. `yarn gen:api-types`를 실행해 생성 결과와 typecheck 영향을 확인한다.
4. nullable, enum, integer, request·response shape를 임의로 단순화하지 않는다.
5. schema 계약이 불명확하거나 URL이 Swagger UI HTML이면 생성하지 않고 raw schema를 요청한다.

## 완료·출력

- schema source 유형(값 제외), output, 실행 command·결과, 변경된 consumer 영향과 수동 후속 작업을 적는다.
- API 호출 hook, UI 상태, query key 구현은 `integrate-api` 범위로 분리한다.

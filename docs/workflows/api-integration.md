# API Integration

## 연동 준비

구현 전에 API 문서와 대상 화면을 한 번에 대조한다. 작업 설명 또는 대상 `*.spec.md`에 아래만 짧게 남긴다.

- 호출 화면·사용자 동작과 endpoint method·path
- path, query, body 입력과 response·오류 형태
- 인증, pagination, nullable field, 권한처럼 화면 동작에 영향을 주는 조건
- query 또는 mutation 구분, query key 입력, cache 갱신 대상
- loading, empty, error, disabled, 성공 상태와 아직 확정되지 않은 항목

명세에 없는 값, 상태 코드, pagination 규칙은 구현으로 추측하지 않는다. 필요한 정보를 확인한 뒤 endpoint와 hook을 작성한다.

계약이 크거나 불확실하면 먼저 `.agents/templates/api-contract-map.md`를 작성하고 `assess-api-contract` skill로 누락된 정보를 분리한다. 구현은 `integrate-api`, 구현 후 검토는 `verify-api-integration`으로 이어진다.

## 계약 생성

1. backend가 제공하는 raw OpenAPI JSON 또는 YAML 주소를 확인한다. Swagger UI HTML 주소는 사용하지 않는다.
2. 실제 schema URL은 repository에 기록하지 않는다. 일회성 환경변수 또는 gitignore된 `.env.local`·`.env.openapi.local`에만 둔다.
3. `yarn gen:api-types`를 실행해 `packages/api-core/src/generated/openapi.ts`를 생성하고, 변경된 계약 파일은 함께 검토·커밋한다.
4. 생성 타입은 endpoint 경계에서만 사용한다. component prop이나 디자인 시스템 API에 `paths`, `components`를 직접 노출하지 않는다.

```sh
OPENAPI_SCHEMA_URL=<raw-openapi-json-or-yaml-url> yarn gen:api-types
```

## 앱 연동

- `@app/api-core`는 transport, 오류, query key, 생성 계약만 소유한다.
- web은 server/browser client 경계를 유지하고, endpoint·hook·query key는 `docs/architecture/data-layer.md`의 "파일 배치 (web)"에 따라 feature 안에 만든다.
- admin은 `src/api` 또는 feature 소유 위치에서 endpoint와 TanStack Query hook을 만든다.
- endpoint 함수는 HTTP 요청과 API contract 변환만 담당한다. query key, cache 갱신, loading·error·empty UI는 앱·feature가 소유한다.
- 응답을 바꾸는 parameter는 query key에 모두 포함한다. mutation 뒤 cache 갱신 방식은 필요한 UX 근거로 선택한다.
- query key는 `all → lists/list`, `all → details/detail` 계층 factory로 만들고, 일반 목록과 infinite 목록을 분리한다.
- query hook은 `enabled`, retry, stale time, select처럼 서버 상태 정책을 소유한다. component는 호출 결과로 loading·background loading·empty·error·disabled·success UI를 표현한다.
- optimistic update는 rollback과 동시 mutation 처리까지 검증할 수 있을 때만 사용한다. 그렇지 않으면 성공 뒤 invalidate 또는 server response 기반 update를 사용한다.

## 검증

1. `yarn gen:api-types`를 실행한다.
2. 관련 앱의 test, lint, typecheck를 실행한다.
3. 생성 타입 변경이 endpoint boundary 밖으로 새지 않았는지 확인한다.
4. query key, cache 갱신, 모든 사용자 상태, retry·오류 안내가 계약과 일치하는지 확인한다.

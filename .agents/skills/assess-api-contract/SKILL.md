---
name: assess-api-contract
description: OpenAPI, Swagger 원본, 백엔드 문서 또는 기존 endpoint를 읽어 UI 구현 전에 API 계약·query key·cache·화면 상태를 정리한다. 새 API 연동의 불확실성을 먼저 해소할 때 사용한다.
---

# API 계약 점검

## 먼저 읽기

1. `docs/architecture/data-layer.md`
2. `docs/workflows/api-integration.md`
3. 대상 app·feature의 가까운 endpoint, query hook, spec
4. 필요하면 `.agents/templates/api-contract-map.md`

## 작업 순서

1. raw OpenAPI JSON·YAML, 승인된 API 문서 또는 이미 구현된 endpoint에서 method, path, request, response, error, 인증을 확인한다. Swagger UI HTML 주소만 있으면 raw schema 주소를 요청하거나 찾는다.
2. 새 request가 속할 app·feature와 `@app/api-core`가 맡을 transport·생성 type의 경계를 정한다.
3. 계약을 API 계약 정리 템플릿으로 기록한다. response 결과를 바꾸는 모든 parameter를 query key에 포함한다.
4. 일반 query, suspense query, infinite query, route prefetch 중 하나를 선택하고 cache 갱신 방식을 명시한다.
5. loading, background loading, empty, error, disabled, success 상태와 필요한 검증 범위를 빠뜨리지 않는다.
6. 계약이 확정되면 생성 type이 필요할 때 `configure-openapi-types`, 구현은 `integrate-api`, 구현 후 감사는 `verify-api-integration`으로 넘긴다.

## 확인이 필요한 항목

아래 중 하나라도 불명확하면 추측하지 않고 먼저 확인한다.

- **Endpoint**: path·method·path parameter·필수 query parameter가 없다. 화면에 필요한 필드가 응답에 없다. API 문서와 실제 Swagger가 다르다.
- **인증**: endpoint가 인증을 요구하는데 token·header·session 출처가 정해지지 않았다. 비로그인 사용자의 동작이 현재 route guard와 다르다.
- **Query 조건**: query가 route·검색·form 상태에 의존하는데 `enabled` 조건이 불명확하다. 빈 응답의 형태가 불명확하다.
- **Infinite query**: 응답에 `nextCursor`, `hasNext`, `page`, `totalPages` 같은 다음 페이지 신호가 없다. 목록을 구성하는 정렬·필터 parameter가 문서화되지 않았다.
- **Mutation**: 성공 응답이 목록·detail 갱신 여부를 알려주지 않는다. 반환된 entity가 `setQueryData`에 쓸 만큼 완전하고 최신인지 알 수 없다. field 단위 오류 메시지에 필요한 error code가 문서화되지 않았다. rollback 규칙 없이 optimistic update가 요청됐다.
- **타입**: nullable 필드가 화면에 영향을 주는데 null 처리 방침이 없다. 숫자·날짜·문자열 포맷이 화면 표시에 쓸 만큼 안정적이지 않다.

## 경계

- 이 skill은 계약을 점검하고 정리한다. 사용자가 요청하지 않으면 API 호출 코드·생성 파일·OpenAPI schema를 수정하지 않는다.
- URL, credential, secret은 문서나 출력에 복사하지 않는다.
- 문서와 실제 endpoint가 다르면 추측으로 맞추지 말고 불일치와 확인 대상을 분리해 기록한다.

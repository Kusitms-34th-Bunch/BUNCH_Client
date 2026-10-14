# API 연동 가이드

이 문서는 사람과 agent가 공유하는 API 구현 절차다. 세부 작업은 `integrate-api`, 계약 검토는 `verify-api-integration`, 타입 생성은 `configure-openapi-types` skill을 사용한다.

## 시작 조건

- 대상 route 또는 feature, endpoint method/path, request/response shape가 확인되어야 한다.
- 계약이 없으면 Swagger UI 화면 주소가 아닌 raw OpenAPI JSON/YAML 또는 백엔드 문서를 요청한다.
- server가 아직 준비되지 않았다면 mock을 실제 계약처럼 승격하지 않는다.

## 소유 규칙

1. endpoint, type, key, query/mutation hook은 현재 route 또는 feature 가까이에 둔다.
2. 한 사용자 흐름이 여러 route에서 검증된 뒤에만 feature·앱 공용으로 승격한다.
3. `packages/api-core`는 client, transport 공통 정책, generated type 경계만 담당한다.
4. component는 endpoint·OpenAPI internals 대신 view-ready props 또는 hook 결과를 받는다.

## 구현 체크리스트

- [ ] method, path, params/search/body, response, error·auth 조건 정리
- [ ] endpoint function과 boundary type 정의
- [ ] response-changing parameter를 포함한 계층형 query key factory 정의
- [ ] query mode와 finite/infinite 구분 결정
- [ ] mutation의 list/detail/infinite cache 영향 명시
- [ ] loading/error/empty/pending/success UI 처리
- [ ] duplicate submit과 auth·validation error retry 정책 확인
- [ ] 문서화된 route면 Data Dependencies와 Verification 갱신

## 완료 기준

- 호출자가 network·cache 세부를 알지 않아도 hook 계약을 사용할 수 있다.
- 오류가 사용자에게 사라지지 않고, cache가 mutation 뒤 예측 가능하게 갱신된다.
- targeted test와 범위별 lint/typecheck/build 결과 또는 미실행 이유가 있다.

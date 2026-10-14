# Domain Ownership

도메인은 폴더 이름을 미리 늘리는 수단이 아니라, 함께 바뀌는 제품 규칙·route·API·상태를 찾는 경계다. 도메인과 명세가 확정된 뒤에만 owner를 만들고, 추측으로 빈 domain 폴더를 만들지 않는다.

## 도메인 문서가 필요한 경우

- 하나의 제품 개념이 둘 이상의 route 또는 feature에서 같은 용어·권한·상태 규칙을 공유한다.
- 같은 API entity를 여러 화면이 다루지만 화면별 UI만으로 계약을 설명하기 어렵다.
- 역할, lifecycle, 상태 전이, URL 규칙 중 하나가 이후 구현의 제약이 된다.

한 화면의 일회성 UI, 아직 확정되지 않은 제품 아이디어, 단순 API endpoint 하나만으로는 domain 문서를 만들지 않는다. 가까운 `*.spec.md`와 API 계약 정리로 충분한지 먼저 판단한다.

## 위치와 소유

- web·admin 모두 기능 기준은 각각 `apps/web/src/features/<feature>/`, `apps/admin/src/features/<feature>/` 가까이에 둔다.
- 실제 구현과 함께 바뀌는 도메인 기준은 owner 가까운 `<domain>.md` 또는 `README.md`에 둔다.
- 두 app에 공통인 제품 개념은 각 app의 구현을 복제하지 않고, 공통 규칙이 확정된 뒤 `docs/domains/<domain>.md`로 승격한다.
- transport와 generated OpenAPI type은 `packages/api-core`가 소유할 수 있지만, 제품 행동·route·UI 정책은 domain 또는 feature에 남긴다.

## 최소 도메인 기준

도메인 문서는 `.agents/templates/domain-context.md`를 사용한다.

1. 책임과 범위 밖 항목
2. 공통 용어와 entity 식별자
3. route·접근 조건·상태 전이
4. API·query key·mutation 영향
5. feature·공용 UI 승격 기준
6. 미확정 사항과 검증 위험

문서는 구현 코드를 해설하지 않는다. 새로운 route, API, 권한, 상태 모델을 판단할 때 참조할 제약만 남긴다.

## 분리와 승격

- 같은 entity를 쓴다고 같은 domain은 아니다. 사용자 행동, 권한, 변경 이유가 다르면 feature를 분리한다.
- domain끼리 직접 서로의 내부 파일을 import하지 않는다. 공통 계약이 필요하면 상위 page/route에서 조합하거나 안정된 shared boundary를 만든다.
- UI primitive는 제품 용어·API·권한을 모를 때만 `@app/design-system`으로 승격한다.
- app 공용 component·hook은 같은 app에서 실제 재사용과 같은 변경 이유가 확인될 때만 올린다.
- domain을 삭제할 때 route, feature, endpoint, query key, fixture, spec, domain 문서가 같은 변경에서 제거되는지 확인한다.

# Feature Specification

기능 spec은 구현 전에 합의된 제품 동작과 완료 기준을 남기는 문서다. 아직 정해지지 않은 도메인 전체를 미리 문서화하지 않는다.

## 작성 시점

- 새 route, 사용자 흐름, 권한, API query·mutation, form·상태 전이가 구현 범위에 포함될 때 작성한다.
- shared 또는 design-system component, public prop·hook·route·API 계약, 여러 사용자 상태를 가진 UI를 추가·변경할 때 작성한다.
- 단순 copy·spacing·색상·typography, import·type-only 변경, test·문서만의 변경에는 선택 사항이다.
- 내부 리팩터링이라도 public API, 책임 경계, 오류·상태 모델을 바꾸면 가까운 spec을 갱신한다.
- 불확실한 항목은 추측으로 채우지 않고 `확인할 항목`에 남긴다.

## 위치와 이름

- web 기능: `apps/web/src/features/<feature>/<feature>.spec.md`
- web route 전용 기능: 해당 `src/app` route 폴더의 `<feature>.spec.md`
- admin 기능: `apps/admin/src/features/<feature>/<feature>.spec.md`
- 여러 app·도메인에 걸치거나, 구현 위치가 아직 정해지지 않았거나, 감사·마이그레이션처럼 하나의 파일에 묶이지 않는 스펙은 `docs/specs/<slug>.md`에 둔다. 도메인이 확정되면 해당 스펙을 다시 co-located 위치로 옮기거나 링크를 남긴다.

`.agents/templates/feature-spec.md`를 기본으로 사용한다. page·component·hook은 목적에 맞는 `.agents/templates/{page,component,hook}.spec.md`를 복사해 owner 가까이에 둔다.

API 계약이 중요한 기능은 `.agents/templates/api-contract-map.md`를 spec 또는 endpoint 가까이에 두고, secret·raw schema URL은 기록하지 않는다.

## 최소 내용

1. 목적과 범위 밖 항목
2. 문제 정의: 지금 할 수 없는 것과 필요한 이유
3. 대상 사용자와 권한
4. 사용자 흐름·route
5. 요구사항: 필수와 있으면 좋은 것을 나눠 체크박스로 추적
6. 입력, 출력, loading·empty·error·success 상태
7. API 계약: 실패 시 정확한 오류 코드·메시지를 포함, 또는 아직 확인할 항목
8. 관찰 가능한 완료 기준

기존 컴포넌트를 리네임하거나 deprecated 처리하는 변경은 영향받는 컴포넌트와 처리 방식을 표로 남긴다.

## 작성 원칙

- 구현 파일을 그대로 해설하지 않고, 사용자에게 보이는 동작·소유 경계·상태·검증만 기록한다.
- component spec은 public API와 호출자 소유/비소유 동작을 구분한다.
- hook spec은 반환 계약, side effect, error를 throw하는지 state로 반환하는지, cache·navigation·storage 영향을 기록한다.
- page spec은 route·access·redirect·layout, URL/form/server/derived state, query enabled·params, mutation 성공·실패를 기록한다.
- loading, empty, error, disabled, invalid, selected 중 실제로 영향을 받는 상태와 keyboard/focus·long text·overflow를 생략하지 않는다.
- 구현이 spec과 달라지면 구현 후에 맞추는 것이 아니라 차이를 먼저 결정하고 spec을 함께 갱신한다.
- 완료 전에는 spec의 route·권한·public API·서버 상태·접근성·검증 기준이 구현과 일치하는지 `verify-spec-sync`로 확인한다.

제품 방향이나 공용 규칙을 제한하는 선택은 spec에 숨기지 않고 `docs/decisions/records/`에 별도로 남긴다.

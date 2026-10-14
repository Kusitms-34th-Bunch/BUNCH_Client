# Maintainability

변경 이유가 같은 코드를 함께 두고, 다른 이유로 바뀌는 코드는 억지로 묶지 않는다. 재사용보다 변경 비용과 계약의 명확성을 우선한다.

## 적용 시점

- feature-local 파일 배치와 폴더 경계를 정할 때
- 공통 module·hook·component로 승격할지, 중복을 허용할지 판단할 때
- props drilling을 composition과 context 중 무엇으로 줄일지 판단할 때
- 기능을 삭제하거나 옮길 때 영향받는 파일 범위를 가늠할 때

## 책임과 배치

- 함께 바뀌는 컴포넌트, 타입, schema, test, story는 가까이 둔다.
- form에서는 필드, validation, 오류 표현, 제출 payload가 서로 떨어져 다른 규칙을 갖지 않게 관리한다.
- route, page, feature, shared, package 경계는 `docs/architecture/app-structure.md`와 `docs/conventions/package-management.md`를 우선한다.
- UI 컴포넌트는 API client, router, business rule을 직접 알지 않도록 두고 필요한 값과 event를 prop으로 받는다.
- 기능을 삭제할 때 component, hook, type, API helper, fixture, spec을 같은 경계에서 함께 제거할 수 있는지 확인한다.

## 계약과 부수효과

- 같은 계층의 API client, query hook, validation function은 일관된 입력·반환 형태를 유지한다.
- navigation, logging, toast, cache 갱신처럼 눈에 보이지 않는 부수효과는 호출 지점 또는 이름이 명확한 wrapper에 둔다.
- 함수가 값만 계산하는지, 서버 상태를 바꾸는지, 화면 이동까지 하는지 호출자가 알 수 있어야 한다.
- 실제 화면에서 쓰지 않는 응답 필드까지 미리 모델링하거나, `any`로 계약을 흐리지 않는다.

## 재사용과 의존성

- 당장은 한 곳에서만 쓰이는 코드는 억지로 공통화하지 않는다.
- 중복을 없애기 위해 서로 다른 도메인·앱의 변경 주기를 묶지 않는다. 겉모양이 비슷해도 규칙과 변경 이유가 다르면 분리된 구현이 더 낫다.
- props 전달이 길어졌다는 이유만으로 전역 상태를 만들지 않는다. composition, local context, feature 경계 재배치를 먼저 검토한다.
- 중간 component가 사용하지 않는 값을 세 단계 이상 전달만 하면 composition이나 경계 재배치를 먼저 검토한다. 역할을 드러내는 prop까지 무조건 context로 숨기지 않는다.
- package public export는 의도적으로 좁게 유지하고 내부 파일 경로를 외부 consumer 계약으로 만들지 않는다.
- 한 번만 쓰는 설정 옵션, 범용 wrapper, 미래 사용처만을 위한 확장 지점은 추가하지 않는다.

## 공통화 판단

- 여러 곳에서 같은 규칙이 반복되고, 앞으로도 함께 바뀔 가능성이 높을 때만 공통화한다.
- 공통 모듈을 바꿨을 때 영향 대상을 빠르게 열거할 수 없다면 공통화가 과한 신호다.
- 공통화의 이득보다 호출부의 이해 비용이 크면 현재 위치에 둔다.

공통화 전에 다음을 모두 확인한다. 하나라도 아니라면 중복을 허용해 결합을 끊는다.

- 동작이 호출부마다 동일한가.
- logging, copy, 후속 동작이 동일한가.
- 가까운 미래에도 동일하게 바뀔 가능성이 높은가.

## Form 변경 단위

- field 단위 validation·비동기 검사·재사용이 핵심이면 field 가까이에 관련 규칙을 둔다.
- 필드 간 의존, multi-step, 하나의 submit payload가 핵심이면 form 전체를 같은 feature 경계에서 관리한다.
- 두 방식을 섞어야 한다면 어느 field가 독립 책임인지 spec에 기록해 validation·error copy·payload 변경이 분산되지 않게 한다.

## Self-check

- feature의 component, hook, type, API helper, fixture, spec이 변경 단위에 맞게 가까이 있는가?
- 같은 상수·option·상태 값이 여러 파일에서 독립적으로 관리되지 않는가?
- 삭제할 때 폴더 경계에서 관련 코드까지 함께 정리할 수 있는가?
- 공통화가 호출부 이해 비용보다 실제 변경 비용을 더 줄이는가?
- composition으로 해결할 수 있는 전달 문제를 context·shared util로 과도하게 승격하지 않았는가?

# 디자인 시스템 컴포넌트 가이드

`packages/design-system`은 여러 app이 같은 UI 계약을 공유할 때만 사용한다. 구현은 `create-ds-component`, 앱 내부 재사용은 `create-app-component`를 사용한다.

## 도입 판단

- 두 app 또는 package가 같은 component API와 시각·접근성 계약을 필요로 하는지 먼저 확인한다.
- 한 화면 전용 조립, domain copy, route·API state는 design system에 넣지 않는다.
- 기존 primitive·token으로 해결 가능한지 확인하고 새 component는 마지막 선택으로 둔다.

## 구현 체크리스트

- [ ] generator와 기존 component directory·public export 확인
- [ ] token과 existing primitive 조합 우선
- [ ] props, variant, size, state를 타입으로 제한
- [ ] semantic HTML, accessible name, keyboard/focus, disabled/error 확인
- [ ] className/ref 확장 정책과 unsupported state 명시
- [ ] story에 variant·edge state, test에 사용자 관찰 동작 추가
- [ ] public export와 generated check 확인

## 완료 기준

- app 의존성 없이 독립적으로 import 가능하고 consumer별 조건부 분기가 없다.
- `yarn check:generated`, 관련 test, typecheck 결과와 consumer 영향이 기록된다.

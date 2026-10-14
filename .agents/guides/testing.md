# 테스트 가이드

테스트는 구현 세부가 아니라 사용자가 관찰하는 계약과 회귀 위험을 고정한다. 자세한 규칙은 `docs/workflows/testing.md`, 작성은 `gen-tests` skill을 사용한다.

## 작업 순서

1. 대상 source, export, 현재 test, 가까운 사용처를 읽는다.
2. 새 동작과 보존할 이전 동작을 구분한다.
3. utility, hook, interactive component, page flow 중 가장 작은 적절한 test 층을 선택한다.
4. 외부 경계만 mock하고 render → interaction → observable output을 검증한다.
5. 변경 위험에 맞는 상태와 실패 조건을 추가하고 targeted command를 실행한다.

## 우선순위

- 과거 회귀, 분기, validation, interaction, error·retry, API boundary
- loading, empty, error, disabled, success처럼 UI를 바꾸는 상태
- public contract가 바뀌는 hook·component

단순 정적 markup, formatter가 보장하는 style, 외부 library 내부 동작은 우선순위가 낮다. 실패를 `skip`·`only`로 감추지 않는다.

# Hook 가이드

순수 함수로 충분한지, 단일 책임 hook이 필요한지, 화면 조합 hook까지 필요한지는 `docs/code-quality/component-logic.md`의 판단 기준을 따른다. 이 가이드는 판단이 끝난 뒤 실제로 hook을 만들 때 놓치기 쉬운 것만 정리한다.

## 시작 전 정리

| 항목        | 확인할 내용                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| 책임        | 한 문장으로 이름 붙일 수 있는 책임인가 (validation, query param, mutation, modal, selection, pagination 등) |
| 입력        | 필요한 인자와 기본값, 외부 상태 의존 여부                                                                   |
| 반환 shape  | 같은 종류의 다른 hook과 일관된 반환 패턴인지                                                                |
| side effect | navigation, toast, logging, storage write를 hook이 직접 실행하는지, 호출부로 넘기는지                       |
| 사용처      | 지금 사용처가 하나인지 여럿인지, 공용 hook 승격 조건을 만족하는지                                           |

## 책임 분리

- React state·lifecycle이 필요 없는 계산은 hook이 아니라 순수 함수로 둔다.
- hook 이름과 return shape만으로 부수효과를 예측할 수 있게 한다. `useValidation`이 mutation이나 navigation을 실행하지 않는다.
- 여러 hook을 조합하는 화면 전용 로직은 개별 hook에 밀어넣지 않고 조합 hook으로 분리할지 `component-logic.md`의 "화면 조합 Hook" 기준으로 판단한다.
- 사용처가 둘 이상이라는 이유만으로 공용 hook으로 올리지 않는다. `component-logic.md`의 "공용 Hook 승격" 조건을 모두 만족할 때만 올린다.

## 상태 체크리스트

- [ ] 책임과 이름이 한 문장으로 설명됨
- [ ] 반환 shape이 같은 종류의 다른 hook과 일관됨
- [ ] side effect 위치(hook 내부 또는 호출부)가 명확함
- [ ] 조건부로 호출되지 않음
- [ ] 독립적으로 test 가능한 seam이 있음

## 검증

state 전이, side effect 발생 조건, 반환값 변화를 hook test로 검증한다. UI markup과 style은 hook test 범위가 아니다. 세부 기준은 `docs/workflows/testing.md`를 따른다.

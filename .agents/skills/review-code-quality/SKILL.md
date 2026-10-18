---
name: review-code-quality
description: frontend diff의 가독성, 예측 가능한 계약, 변경 경계, 불필요한 복잡도를 읽기 전용으로 검토한다. 집중 코드 품질 리뷰에 사용한다.
---

# 코드 품질 리뷰

## 기준

- `docs/code-quality/`, 특히 `readability.md`, `contracts.md`, `maintainability.md`, `component-logic.md`와 대상 코드의 가까운 test·spec·기존 패턴을 읽는다.
- 코드 품질은 가독성·예측 가능성·응집도·결합도 네 기준으로 판단한다(`docs/code-quality/index.md`). 네 기준은 동시에 완벽히 만족되지 않으므로, 서로 충돌하면 "지금 이 코드를 가장 변경하기 쉽게 만드는가"를 우선한다.
- 동작 오류는 `review-changes`, 구조 소유 문제는 `review-architecture`로 구분해 다룬다.

## 범위 확정

1. `git status --short`, base 대비 diff로 리뷰할 파일을 정한다. diff를 쓸 수 없으면 검토할 파일 목록을 먼저 명시한다.
2. PR 리뷰라면 CodeRabbit 또는 기존 reviewer thread가 이미 지적한 항목을 확인해, 같은 내용을 새 finding으로 반복하지 않는다.
3. generated file, lockfile, snapshot은 이번 변경으로 생긴 게 아니면 살피지 않는다.

## 기준별 체크리스트

각 finding은 아래 중 어떤 기준을 위반했는지 밝힌다. 하나의 코드가 여러 기준에 동시에 걸릴 수 있다.

### 가독성 (`readability.md`)

- 하나의 함수·컴포넌트가 서로 독립적인 여러 시나리오를 한 번에 처리하지 않는가.
- loading, error, empty처럼 화면을 결정하는 상태가 먼저 드러나는가.
- 중첩 ternary, JSX 내부 IIFE·`switch`·중첩 return으로 분기 흐름을 숨기지 않는가.
- 복합 조건과 매직 넘버가 의도가 드러나는 이름으로 표현되는가.

### 예측 가능성 (`contracts.md`)

- 이름과 타입만으로 network, cache, navigation, storage, logging에 미치는 영향을 예상할 수 있는가.
- 같은 역할의 함수·hook·validator가 서로 다른 성공·실패 shape를 반환하지 않는가.
- 실패가 호출자에게 사라지거나 성공처럼 보이지 않는가.
- render 중 side effect를 실행하지 않는가, hook을 조건부로 호출하지 않는가.

### 응집도 (`maintainability.md`의 "책임과 배치")

- 함께 바뀌는 component, type, schema, test, fixture가 가까이 있는가.
- 이 기능을 삭제할 때 관련 코드를 같은 경계에서 함께 지울 수 있는가.
- form의 필드, validation, 오류 표현, 제출 payload가 서로 다른 위치에서 흩어져 관리되지 않는가.

### 결합도 (`maintainability.md`의 "재사용과 의존성", `component-logic.md`의 "공용 Hook 승격")

- 사용처가 여럿이라는 이유만으로 공통화·공용 hook 승격을 하지 않았는가. 변경 이유와 정책이 실제로 같은지 확인한다.
- props drilling을 composition이나 경계 재배치 대신 context·전역 상태로 조급하게 승격하지 않았는가.
- 서로 다른 도메인·화면의 변경 주기를 중복 제거를 이유로 억지로 묶지 않았는가.

### 로직 구성 (`component-logic.md`)

- 순수 함수로 충분한 계산을 hook으로 만들지 않았는가.
- 추출한 hook이 하나의 책임과 변경 이유를 갖는가.
- 화면 조합 hook이 하위 hook을 조율하는 대신 세부 로직을 재구현하는 god hook이 되지 않았는가.
- 컴포넌트를 분리할지는 `component-logic.md`의 "상황별 분리 판단" 표를 참고 기준으로 삼는다.

## 그 외 확인 항목

- 구현 세부를 누출하는 prop, 과도한 `any`·type assertion, dead code, 불필요한 주석을 확인한다.
- 제안이 동작 보존인지와 필요한 회귀 테스트를 함께 판단한다.

## 심각도

`docs/code-quality/review.md`의 Finding 기준을 따른다.

## 출력

각 finding은 아래 형식을 지킨다.

```markdown
### [Major] 짧은 제목

- 기준: 가독성 | 예측 가능성 | 응집도 | 결합도 | 로직 구성
- 위치: `path/file.ts:42`
- 문제: 관찰한 사실
- 영향: 유지보수·변경 비용에 미치는 영향
- 수정: 최소 수정 방향
```

finding이 없으면 검토 범위와 확인하지 못한 파일·런타임 상태를 residual risk로 남긴다. 자동 formatter·linter가 해결할 항목은 finding으로 중복하지 않는다. 코드 수정, 의존성 추가, 커밋은 하지 않는다.

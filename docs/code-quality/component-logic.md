# 컴포넌트와 Hook 구성

컴포넌트나 hook의 줄 수를 줄이는 것이 목적이 아니다. 화면 구조, 책임, side effect 위치, 호출부의 이해 비용을 더 분명하게 만들 수 있을 때만 로직을 분리한다.

단일 책임 원칙은 "컴포넌트는 반드시 하나의 역할만 해야 한다"는 절대 규칙이 아니라 판단을 돕는 도구다. 핵심은 변경 이유가 둘 이상이면 분리하고, 하나면 굳이 나누지 않는 것이다. 분리 여부는 "나중에 읽고 고치기 쉬운 코드가 되는가"로 판단한다.

## 적용 시점

- 컴포넌트 내부에 form, query param, mutation, modal, navigation, toast, analytics 흐름이 함께 섞일 때
- 이미 hook으로 뺐지만 여러 복잡한 흐름이 하나의 hook에 결합돼 있을 때
- 화면에서 소비하는 hook import가 늘어 흐름 파악이 어려울 때
- 공용 hook으로 승격할지, 화면 전용으로 남길지 판단할 때

## 상황별 분리 판단

| 상황                                                 | 판단                                         |
| ---------------------------------------------------- | -------------------------------------------- |
| UI가 단순함                                          | 분리하지 않는다                              |
| 다른 화면에서 재사용 가능성이 있음                   | 분리한다                                     |
| UI는 단순하지만 로직이 복잡함                        | 순수 함수 또는 단일 책임 hook으로 분리한다   |
| UI와 비즈니스 로직이 섞여 있음                       | 분리한다                                     |
| 변경할 때 관련 파일 여러 개를 동시에 고쳐야 함       | 분리하지 않는다 (분리하면 응집도가 낮아진다) |
| 파일이 커져 흐름 파악이 어려움 (대략 200~300줄 이상) | 분리를 검토한다                              |

이 표는 참고 기준이며 절대 임계값이 아니다. 애매하면 아래 판단 순서로 구체적인 방식(순수 함수/단일 책임 hook/조합 hook/공용 hook)을 정한다.

## 판단 순서

1. React state·lifecycle 없이 해결되는 계산인지 확인한다. 그렇다면 hook보다 순수 함수로 둔다.
2. 하나의 상태 전이 또는 변경 이유가 명확한지 확인한다. 그렇다면 단일 책임 hook을 검토한다.
3. 화면에서 여러 hook의 결과를 조합하는 흐름이 길어졌는지 확인한다. 그렇다면 화면 전용 조합 hook을 검토한다.
4. 여러 사용처가 같은 변경 이유·정책·후속 동작을 공유하는지 확인한다. 그때만 공용 hook 승격을 검토한다.

## 컴포넌트에 남길 로직

다음은 화면 구조를 읽는 데 도움이 되면 컴포넌트에 둔다.

- JSX 한 곳에서만 쓰는 짧은 derived value
- 화면 copy·design-system prop으로의 단순 mapping
- 해당 화면에서만 쓰는 짧은 event handler
- 조건과 결과가 가까이 있는 loading, empty, error 분기

다만 JSX 안에 IIFE, `switch`, 중첩 return, 긴 boolean expression을 넣어 선언적 구조를 숨기지 않는다. 분기 계산은 JSX 위에서 이름을 붙인다.

## 순수 함수와 단일 책임 Hook

payload mapping, sort/group/filter, display label formatting, 외부 상태가 없는 validation, enum·option 변환은 순수 함수를 우선한다. React 기능이 없으면 `use*` 이름을 붙이지 않는다.

다음 중 하나가 성립하면 단일 책임 hook을 검토한다.

- validation, query parameter, mutation, modal, selection, pagination처럼 책임을 한 문장으로 이름 붙일 수 있다.
- 상태 전이·외부 side effect·검증 규칙이 컴포넌트 render와 분리돼야 한다.
- 같은 책임을 가진 여러 action과 state를 함께 제공해야 한다.
- 독립 test 또는 fixture가 필요한 도메인 규칙이 있다.

hook 이름과 return shape는 책임과 side effect를 예측할 수 있어야 한다. query param, form, mutation, modal, toast, navigation, analytics를 하나의 hook이 직접 모두 관리하는 구조는 피한다.

좋은 단일 책임 hook은 이름만으로 책임을 예측할 수 있다.

```text
useMemberProfileValidation
useOrderQueryParams
useDiscountMutation
useFileUploadState
```

## 화면 조합 Hook

여러 작은 hook을 쓰는 것만으로 조합 hook을 만들지 않는다. 다음 상황에서만 route·page·section 전용 조합 hook을 검토한다.

- 여러 hook 결과를 엮는 submit·next step·disabled·navigation 흐름이 길어져 화면 구조가 읽히지 않는다.
- 같은 화면 흐름을 test·story·fixture에서 독립적으로 다뤄야 한다.
- 화면 수준의 view model과 action을 이름 있는 계약으로 만들면 변경 단위가 더 명확해진다.

조합 hook은 하위 hook을 조율하고 화면이 바로 소비할 view model·action을 반환한다. validation 세부 구현, payload parsing, mutation internals, toast·analytics 정책을 모두 직접 품는 god hook이 되지 않게 한다.

```text
useCheckoutFlow
  - OK: useShippingForm, usePaymentMethod, useOrderMutation을 조합해 view model을 반환한다.
  - BAD: validation 세부 규칙, payload 변환, mutation 재시도, toast 문구를 모두 직접 구현한다.
```

## Import 개수와 조합 판단

hook을 여러 개 import하는 것 자체는 문제가 아니다.

- hook 1~3개를 그대로 소비해도 화면 흐름이 잘 읽히면 그대로 둔다.
- hook마다 화면 구조와 1:1로 대응하면 import가 많아도 그대로 둘 수 있다.
- 여러 hook 결과를 엮는 glue code가 길어지면 조합 hook을 검토한다.
- 같은 조합이 여러 화면에서 반복되면 조합 hook 또는 공용 hook 승격을 검토한다.

판단 기준은 import 개수가 아니라 조합 로직의 변경 이유와 읽기 비용이다.

## 공용 Hook 승격

사용처가 둘 이상이라는 이유만으로 승격하지 않는다. 아래가 모두 맞아야 한다.

- 변경 이유와 UX 정책이 같다.
- copy, route, API, logging, analytics, 후속 동작이 같다.
- 새 public API를 호출자가 예측하기 쉽다.
- 수정 뒤 확인할 consumer를 빠르게 열거할 수 있다.
- app-specific 정책이 app 공용 또는 package 경계로 새지 않는다.

사용처별 정책이 다를 가능성이 크면 중복을 허용해 변경 영향 범위를 끊는다.

## Return Shape 기준

hook의 반환 shape은 호출부가 오해하기 어렵게 고정한다.

- 같은 종류의 hook은 같은 반환 패턴을 쓴다.
- TanStack Query wrapper는 팀 규칙에 따라 query 객체를 그대로 반환한다.
- 조합 hook은 화면이 바로 소비할 view model과 action 중심으로 반환한다.
- 반환 값이 많아 납작해지면 관련 값을 그룹으로 묶는다.

```ts
type CheckoutFlow = {
  shipping: ShippingFormState;
  payment: PaymentMethodState;
  submit: {
    disabled: boolean;
    isPending: boolean;
    action: () => void;
  };
};
```

## State 표현과 에스컬레이션

boolean flag는 늘어날수록 조합이 불가능한 상태를 만든다. `isLoading`, `isError`, `isEmpty`, `isPending` 4개면 이론상 16가지 조합이 생기고 대부분은 실제로 있을 수 없는 상태다. 서로 배타적인 상태는 하나의 discriminated union으로 표현한다.

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```

상태 표현은 아래 순서로만 올린다. 앞 단계로 표현되면 다음 단계로 넘어가지 않는다.

1. `useState` — 서로 독립적인 값이거나 조합이 적은 경우.
2. union이 있는 reducer — 하나의 dispatch가 하나의 유효한 상태만 만들도록 전이를 한곳에 모아야 하는 경우.
3. state machine — 재시도, 리셋, 동시 요청 경합처럼 전이 자체에 조건이 여러 개 걸리는 경우에만. 처음부터 state machine으로 시작하지 않는다.

## Anti-Pattern

- 컴포넌트가 길다는 이유만으로 모든 로직을 이름 없는 `usePageSomething` 하나로 옮긴다.
- 하나의 hook이 query param, form, mutation, modal, toast, navigation, analytics를 모두 직접 관리한다.
- hook 이름은 `useValidation`인데 내부에서 mutation이나 navigation을 실행한다.
- 조합 hook이 하위 hook을 조율하는 대신 세부 로직을 직접 구현한다.
- 공용 hook이 app-specific copy, route, API 정책을 알고 있다.
- 순수 함수로 충분한 계산을 hook으로 만들어 불필요한 React 의존을 만든다.

## Self-check

- 컴포넌트가 화면 구조보다 side effect를 먼저 읽게 만들지 않는가?
- 추출한 hook이 하나의 책임과 변경 이유를 갖는가?
- 순수 함수로 충분한 계산을 hook으로 만들지 않았는가?
- 조합 hook이 하위 hook을 조율하는 대신 세부 로직을 재구현하지 않는가?
- import 수가 아니라 glue code의 읽기 비용을 근거로 추출했는가?
- 추출 뒤 test·fixture·spec의 변경 경계가 더 선명해졌는가?

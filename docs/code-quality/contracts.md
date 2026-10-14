# 계약과 예측 가능성

호출자는 함수·hook·component의 이름, 입력, 반환 타입만으로 중요한 동작을 예상할 수 있어야 한다. 여기서 중요한 것은 모든 API를 같은 모양으로 만드는 것이 아니라, 같은 책임을 가진 API가 같은 약속을 지키는 것이다.

## 적용 시점

- 함수·hook·API helper의 반환 타입과 오류 처리 방식을 정할 때
- 외부 library wrapper가 원본과 다른 동작(인증, retry, toast, tracking)을 더할 때
- 디자인 시스템·공용 컴포넌트의 DOM semantics와 public API를 설계할 때
- render 중 side effect, props-state 동기화, hook 호출 순서가 React 규칙과 맞는지 확인할 때

## 이름과 실제 동작

- `get`, `fetch`, `calculate`, `use*` 같은 이름이 logging, navigation, storage write, cache mutation까지 수행하면 그 부수효과를 호출부 또는 명시적인 wrapper에서 드러낸다.
- 외부 library wrapper가 원본보다 인증·retry·toast·tracking 같은 동작을 더하면 이름·문서·반환 타입 중 하나로 차이를 보인다.
- 값 계산과 서버 변경, 화면 이동을 한 함수에 섞어 호출자가 실패·재시도·테스트 범위를 알 수 없게 만들지 않는다.

```ts
// 호출자가 저장 동작을 예상할 수 있다.
await saveMemberProfile(input);

// navigation까지 수행한다면 별도 이름·경계로 드러낸다.
await saveMemberProfileAndNavigate(input);
```

## 일관된 반환과 오류

- 같은 계층의 validator, parser, mapper, query hook은 호출자가 같은 방식으로 처리할 수 있는 반환 shape를 유지한다.
- 실패를 값으로 다루는 validator는 `boolean`과 임의 문자열을 섞지 않고, 실패 이유가 필요하면 discriminated union 같은 명시적 결과를 사용한다.

```ts
type ValidationResult = { ok: true } | { ok: false; reason: string };
```

- 오류를 throw하는지, 상태로 반환하는지, caller가 처리하는지 경계를 정한다. 네트워크 오류를 성공처럼 빈 값으로 바꾸지 않는다.
- nullable·unknown 외부 input은 소비 경계에서 normalizing하고, assertion을 여러 호출부로 전파하지 않는다.

## Hook과 component 계약

- 같은 feature의 query hook은 return shape와 query key·error 처리 관례를 일관되게 유지한다.
- component prop은 사용자에게 보이는 동작을 표현하고, 서로 충돌하는 boolean 조합이 늘어나면 variant 또는 discriminated union을 검토한다.
- hidden global state, implicit provider, side effect가 있어야만 동작하는 component는 dependency와 fallback을 드러낸다.

## React 상태와 DOM 의미

- render 중 toast, navigation, logging, mutation, storage write 같은 side effect를 실행하지 않는다.
- props/state에서 바로 계산할 수 있는 값은 effect와 별도 state로 동기화하지 않는다.
- props를 state로 복사할 때는 uncontrolled 초기값인지 controlled 동기화인지 public API에서 분명히 한다.
- hook을 조건부로 호출하지 않는다. 조건은 hook option이나 내부 guard로 전달한다.
- 컴포넌트 함수 안에서 새 컴포넌트를 선언하지 않는다. 렌더마다 새 타입이 만들어져 매 렌더 remount되고 자식 state가 사라진다. 분리가 필요하면 바깥 스코프의 별도 컴포넌트로 뺀다.
- effect 안에서 prop·state를 closure로 참조하는 콜백(로깅, 상위에서 받은 핸들러)을 호출할 때, 그 콜백이 재동기화 조건이 아니라면 `useEffectEvent`로 감싸 effect의 의존성 배열에서 제외한다. 의존성에 그대로 넣으면 호출부가 리렌더될 때마다 effect가 불필요하게 재실행되고, `eslint-disable`로 생략하면 stale closure가 생긴다. 의존성 배열에는 실제로 재동기화를 트리거해야 하는 값만 남긴다.
- list key는 안정적인 id를 사용한다. 순서가 바뀔 수 있는 list의 index key와 매 render마다 바뀌는 random key는 피한다.
- render 중에 `Date.now()`, `new Date()`, `Math.random()`을 직접 호출하지 않는다. apps/web(App Router)은 서버에서 먼저 렌더링하므로, 이 값들이 서버·클라이언트 렌더 사이에 달라지면 hydration mismatch가 난다. 현재 시각이 필요하면 mount 이후 state로 설정하는 hook(`useEffect`에서 설정)을 쓰고, 장식용 분포·순서는 index 같은 결정적인 값에서 유도한다.
- web·admin 모두 React Compiler가 켜져 있다(`reactCompiler: true`, `reactCompilerPreset()`). 새 코드에 `useMemo`, `useCallback`을 직접 쓰지 않는다 — memoization은 컴파일러가 처리하고, 수동으로 추가한 의존성 배열은 시간이 지나면서 코드와 어긋나기 쉽다. 서드파티 API가 렌더 간 안정된 참조를 강제로 요구하는 경우(구독 등)에만 `useRef`나 effect-scoped closure를 검토한다.

component 이름·props와 DOM semantics도 같은 계약이다. navigation은 link, mutation/action은 button을 사용한다. ARIA role은 그 role이 요구하는 keyboard, focus, state 속성을 실제로 제공할 때만 사용한다. 예를 들어 `role="checkbox"`를 쓰면 `aria-checked`, Space key toggle, focus target을 함께 제공해야 한다. 상태 전환 command면 `aria-pressed` toggle button을, 선택 항목 모델이면 listbox·menu·checkbox 중 더 맞는 semantics를 검토한다.

React 18 호환이 필요 없는 새 컴포넌트는 `forwardRef`보다 `ref` prop을 우선 검토한다.

## 확인 질문

- 이름과 type만으로 network, cache, navigation, storage, logging 영향을 예상할 수 있는가?
- 같은 역할의 함수가 서로 다른 성공·실패 shape를 반환하지 않는가?
- 실패가 호출자에게 사라지거나 성공처럼 보이지 않는가?
- 외부 입력을 검증하는 경계가 한 곳에 있는가?

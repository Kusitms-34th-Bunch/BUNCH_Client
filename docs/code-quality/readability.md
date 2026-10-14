# Readability

읽는 사람이 실행 순서와 상태 전이를 빠르게 파악할 수 있게 작성한다. 이름을 늘리거나 파일을 나누는 것 자체가 목적은 아니다.

## 적용 시점

- 조건 분기와 렌더링 흐름을 작성하거나 정리할 때
- 복잡한 boolean 조건, 중첩 삼항, JSX 내부 절차형 로직이 보일 때
- 인증, 권한, redirect처럼 화면 목적과 무관한 제어 로직을 어디에 둘지 판단할 때
- 리뷰에서 "한 번에 읽히지 않는다"는 지적을 구체적인 근거로 바꿀 때

## 흐름과 분기

- 하나의 함수나 컴포넌트가 서로 독립적인 여러 시나리오를 처리하면 최상위 분기 또는 작은 단위로 나눈다.
- loading, error, empty처럼 화면을 결정하는 상태는 먼저 드러낸다. `undefined`, 빈 배열, loading 상태를 같은 의미로 취급하지 않는다.
- 중첩 ternary를 쓰지 않는다. JSX의 단순한 두 갈래 전환 외에는 early return 또는 명시적인 분기로 펼친다.
- `else`가 `null`뿐인 단순 렌더링은 `&&`를 검토하되, number·string·object가 의도치 않게 렌더되지 않도록 `items.length > 0`, `value != null`처럼 boolean 조건을 명시한다.
- JSX 안의 IIFE, `switch`, 중첩 return은 분기 흐름을 숨기므로 JSX 위에서 이름 있는 값·분기로 정리한다.
- 페이지 목적과 직접 관계없는 인증, 권한, redirect, storage 같은 제어 로직은 적절한 guard, hook, provider로 분리한다.
- query 상태, form 상태, URL 상태, UI 상태를 하나의 거대한 hook에 섞지 않는다.

```tsx
if (isPending) return <MemberListSkeleton />;
if (isError) return <MemberListError onRetry={refetch} />;
if (members.length === 0) return <MemberListEmpty />;

return <MemberList members={members} />;
```

## 이름과 표현식

- 복합 조건은 의도가 드러나는 boolean 또는 predicate 함수로 이름을 붙인다.
- 시간, 개수, 임계값에는 단위를 포함한 이름 있는 상수를 사용한다. 예: `REQUEST_TIMEOUT_MS`.
- 비교식은 가능한 한 왼쪽에서 오른쪽으로 자연스럽게 읽히게 쓴다.
- 단순하고 자명한 표현식까지 불필요하게 함수·상수로 쪼개어 읽는 흐름을 해치지 않는다.

```ts
const isWithinSelectableRange = startDate <= selectedDate && selectedDate <= endDate;
const REQUEST_TIMEOUT_MS = 5_000;
```

## UI 표현

- 의미 있는 HTML 요소를 우선 사용하고, 아이콘만 있는 조작 요소에는 접근 가능한 이름을 제공한다.
- 목록 key는 배열 위치가 아니라 안정적인 식별자를 사용한다.
- boolean prop이 늘어나 서로 충돌하기 시작하면 variant 또는 상태 모델로 의도를 표현한다.
- 조사 과정에서 넣은 `console.log`와 임시 조건문은 검증이 끝나면 제거한다. 운영 관찰이 필요하면 목적과 민감 정보 노출 여부가 분명한 logging 경계를 사용한다.

## 확인 질문

- 이 파일을 위에서 아래로 읽었을 때 요구사항과 상태 전이가 보이는가?
- 조건, 상수, 함수명이 의도를 설명하는가?
- 동작을 이해하기 위해 먼 파일이나 정의를 반복해서 오가야 하지 않는가?
- 화면의 조작 요소와 상태가 사용자에게도 명확하게 전달되는가?

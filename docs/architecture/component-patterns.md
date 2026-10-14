# Component Patterns Reference

이 문서는 컴포넌트 API와 조합 방식을 고를 때의 선택 기준이다. 모든 패턴을 기본으로 적용하지 않고, 필요한 복잡도에 맞는 가장 단순한 방식을 선택한다.

## Variant

시각적 상태가 여러 축으로 반복될 때 `variant`, `size`, `tone`처럼 상호 배타적인 prop으로 표현한다. `primary`, `secondary`, `large` 같은 boolean 조합이 늘어나면 잘못된 조합을 만들기 쉽다.

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
};
```

한 번만 쓰이는 조건이나 동작 자체를 바꾸는 조건에는 variant를 만들지 않는다.

## Controlled component

선택값·입력값을 부모가 소유하거나 외부 상태와 동기화해야 할 때 `value`와 `onValueChange`를 사용한다.

```tsx
type FilterProps = {
  value: string;
  onValueChange: (value: string) => void;
};
```

초기값만 필요하고 외부 동기화가 없다면 내부 상태를 가진 단순 컴포넌트가 더 적합하다.

## Slot props

레이아웃 구조는 컴포넌트가 유지하고 header, footer, action처럼 일부 위치만 호출자가 바꿔야 할 때 사용한다.

```tsx
<PageLayout header={<Header />} footer={<SaveButton />}>
  <ProfileForm />
</PageLayout>
```

slot이 계속 추가되어 조합 자유도가 커지면 compound component 또는 호출부 직접 조합을 검토한다.

## Compound component

Tabs, Dialog, Select처럼 하위 요소가 같은 상태·키보드 동작·ARIA 관계를 공유할 때 사용한다. 항상 같은 순서와 구조를 갖는 page shell에는 compound component보다 slot props가 단순하다.

compound 내부에서만 필요한 선택·열림 상태는 내부 context로 감춘다. 반대로 route, URL, form처럼 외부 상태와 동기화해야 하는 값은 controlled prop으로 소유자를 드러낸다. context를 props drilling의 기본 대체재로 사용하지 않는다.

## Render prop

테이블 행이나 목록 항목처럼 컴포넌트가 데이터를 제공하고 호출자가 항목별 렌더링을 결정해야 할 때 사용한다. 고정된 위치에 JSX 하나를 넣는 경우에는 render prop보다 slot prop을 사용한다.

## Discriminated union props

prop 조합이 type에 따라 달라져 잘못된 조합을 타입 단계에서 막아야 할 때 사용한다.

```ts
type ActionProps =
  | { kind: 'button'; onClick: () => void; href?: never }
  | { kind: 'link'; href: string; onClick?: never };
```

단순 optional prop 몇 개까지 이 패턴을 강제하지 않는다.

## Container, presentational component, feature hook

- data query, navigation, 상태 전이, side effect가 JSX보다 복잡해지면 container 또는 feature hook으로 분리한다.
- presentational component는 데이터를 prop으로 받고 UI와 접근성 표현에 집중한다.
- 작은 화면을 형식만 맞추기 위해 container와 presentational로 나누지 않는다.
- hook은 UI markup을 포함하지 않고 상태와 동작을 반환한다.
- Next.js에서는 browser API나 event가 필요한 가장 작은 컴포넌트만 client component로 만든다.

## TypeScript patterns

여러 곳에서 같은 값 목록을 사용하면 `as const` tuple에서 union을 파생한다.

```ts
const MEMBER_ROLES = ['OWNER', 'MEMBER'] as const;
type MemberRole = (typeof MEMBER_ROLES)[number];
```

union 값별 설정을 빠짐없이 정의해야 하면 `satisfies`를 사용한다.

```ts
const roleLabels = {
  OWNER: 'Owner',
  MEMBER: 'Member',
} satisfies Record<MemberRole, string>;
```

순서가 중요한 반복 UI는 tuple·배열로, 모든 값의 설정이 필요한 경우는 `Record`로 표현한다.

## 적용 전 질문

- 지금 필요한 것은 스타일 변형, 상태 공유, 고정 위치 주입, 항목별 렌더링 중 무엇인가?
- 이 패턴이 호출부와 테스트를 실제로 단순하게 만드는가?
- 컴포넌트가 route·도메인 문맥 없이 재사용되는가?
- `docs/architecture/components.md`의 배치와 접근성 기준을 만족하는가?

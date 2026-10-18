# 컴포넌트: Stepper

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import)
- Status: 구현됨(Storybook 렌더를 Figma 스크린샷과 눈으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `StepperItem`(node `754:5617`)과 `PageHeader` 안의 `Stepper`(node `770:2664`). Figma의 `StepperItem`은 코드에서 `Stepper` 내부 막대로만 쓰고 따로 export하지 않는다.

## 목적과 범위

### 제공하는 동작

- 단계 수만큼 같은 폭의 높이 4px 막대를 가로로 보여 주고, 현재 진행 중인 단계의 막대만 브랜드 연한 색으로 채운다(2단계라면 비활성·선택·비활성 순).
- 진행 상황을 `role="progressbar"`와 `aria-valuenow`·`aria-valuemax`·`aria-valuetext`로 전달한다.

### 제공하지 않는 동작

- 막대를 눌러 단계를 이동하는 동작, 단계 이름·번호 표시는 디자인에 없어서 만들지 않았다.

## Public API

- Props: `total`(전체 단계 수), `current`(현재 단계, 1부터), 그리고 native `<div>` 속성(`className`, `aria-label`, `aria-valuetext` 등. `children`은 받지 않는다).
- 기본값: `aria-label`은 `진행 단계`, `aria-valuetext`는 `{total}단계 중 {current}단계`. 제품 문구를 쓰려면 호출자가 덮어쓴다.
- 보정: `total`은 1 이상 정수로, `current`는 1과 `total` 사이로 맞춘다.
- 호출자 소유 책임: 접근성 문구(다른 언어·표현이 필요할 때), 폭 같은 배치 클래스.

## 상태와 동작

- 전환: 같은 요소에서 `current`가 바뀌면 막대 색이 300ms 동안 CSS `ease-out`(`cubic-bezier(0, 0, .58, 1)`)으로 바뀐다. `ease-[ease-out]`으로 Tailwind 기본 곡선과 구분한다. 화면설계서 `791:8480`은 「진행바만 인터랙션 O」로 명시하므로 제목·본문에는 이 효과를 적용하지 않는다. `prefers-reduced-motion: reduce`이면 즉시 바뀐다. 화면이 바뀌며 컴포넌트가 새로 만들어지면 전환이 없으므로, 단계 화면들이 공통 layout에 이 컴포넌트를 두어 계속 남게 하는 것은 호출하는 쪽 몫이다.
- 채움 규칙: `current`번째 막대만 `surface-brand-subtle-2`(Selected), 나머지는 `surface-disabled`(Default). 지나온 단계도 채우지 않는다(디자이너 확인).
- 막대 간격 2px, 반경 `full`. 폭은 컨테이너를 채우고 막대가 균등 분할한다.
- 로딩·에러·disabled 상태는 없다.

## 접근성

- Semantic element: `role="progressbar"`인 `div`. 막대 조각은 `aria-hidden`이라 읽히지 않는다.
- 값 범위: `aria-valuemin`은 1이다(단계는 1부터).
- 색만으로 상태를 전달하지 않는다. 진행 상황은 `aria-valuetext`로 글자로도 전달한다. 시각적으로는 색 차이만 있다(디자인 기준).
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.

## Styling과 의존성

- Token: `h-s2`(4), `gap-s1`(2), `rounded-full`, `bg-surface-brand-subtle-2`, `bg-surface-disabled`. dependency 추가 없음.
- Storybook state matrix: `Default`, `Steps`, `ManySteps`.

## 확인할 항목

- 단계 수 (제안): Figma는 3칸 고정이다. 단계 수를 `total` prop으로 열었다.
- 잘못된 숫자 입력 (제안): `NaN`·`Infinity`는 1로, 범위를 벗어난 `current`는 1과 `total` 사이로 맞춘다. 호출자 실수를 화면이 깨지지 않게 흡수하는 방식이다.
- 접근성 기본 문구 (제안): 한국어 기본값을 두었다. 문구 정책이 정해지면 호출자 책임으로 옮길 수 있다.
- 대비 (미정): `surface-brand-subtle-2`(#a7adff)와 `surface-disabled`(#eaeaea) 막대는 흰 배경에서 비텍스트 대비 3:1에 못 미칠 수 있다. 진행 상황은 `aria-valuetext`로도 전달하며 색은 디자인 값이라 바꾸지 않았다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `stepper` export 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(217 통과, 기존 `icons-bundle` Windows 경로 테스트 2개 실패는 이 변경과 무관)·`gen:index:check`
- [x] Storybook 렌더 확인(375·390px, Figma 스크린샷과 눈 대조). 픽셀 단위 대조와 실기기는 미검증

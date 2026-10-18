# Design System Components

`@app/design-system`에는 Figma에 정의된 UI 컴포넌트를 둔다. 사용처가 한 앱뿐이어도 UI 컴포넌트는 여기에 두되 `core`(모든 앱)와 `web`(apps/web 전용) 구역으로 나누고, 그것들을 조합해 제품 문구·route·데이터·행동을 붙이는 일은 앱의 `features`가 맡는다. 결정 배경은 `docs/decisions/records/010-ui-in-design-system-composition-in-features.md`.

## 분류

- primitive: button, text, layout처럼 다른 UI의 기반이 되는 요소
- form: input, select, checkbox와 validation 표현
- feedback: alert, toast, empty, loading 상태
- overlay: dialog, popover, drawer처럼 focus 관리가 필요한 요소
- navigation: tabs, breadcrumb, pagination처럼 이동·선택을 표현하는 요소
- data display: badge, avatar, table cell처럼 값을 일관되게 보여 주는 요소

분류는 폴더를 미리 늘리기 위한 목적이 아니다. keyboard interaction, focus, role, overflow, 상태 표현처럼 각 종류가 반드시 지켜야 할 계약을 찾기 위한 기준이다.

## 공통 UI 패턴의 접근성

아래 컴포넌트를 design-system에 추가하면 최소 이 상태·역할 계약을 지킨다.

- **checkbox·radio**: 여러 개를 하나의 질문으로 묶을 때는 `<fieldset>`과 `<legend>`로 그룹을 표현한다. radio는 그룹 내 `input`에 같은 `name`을 준다. `<input>`을 못 쓰는 커스텀 UI는 `role="checkbox"`/`role="radio"` + `aria-checked` + `tabIndex={0}` + Space key 핸들러로 대체한다.
- **switch**: `role="switch"`와 `aria-checked`(또는 `<input type="checkbox" role="switch">`의 `checked`)로 on/off를 표현한다. checkbox와 다른 의미(선택 여부가 아니라 켬/끔)이므로 역할을 구분해서 쓴다.
- **accordion**: 가능하면 `<details>`/`<summary>`를 쓴다. 커스텀 구현은 헤더 버튼에 `aria-expanded`, `aria-controls`로 패널 id를 연결하고, 패널에는 `role="region"` + `aria-labelledby`를 준다. `aria-expanded`와 패널의 `hidden` 상태는 항상 동기화한다.
- **확인 dialog(모달)**: `Dialog`·`ConfirmDialog`를 사용한다. Base UI Alert Dialog로 응답을 요구하는 `alertdialog` 의미, 포커스 가두기·복원과 ESC 취소를 처리한다. 바깥 터치는 닫지 않는다. 확인은 콜백만 호출하고 호출자가 `open`을 갱신한다. 모달 안의 오류·필수 안내는 본문에 표시하고 액션 Toast는 모달을 닫은 뒤 띄운다. 폼·풍부한 콘텐츠용 일반 Dialog는 이 확인창의 지원 범위 밖이다. 결정·제약은 [ADR 009](../decisions/records/009-confirm-dialog-base-ui.md), API·토큰은 `packages/design-system/src/components/core/dialog/Dialog.spec.md`를 따른다.
- **tabs**: 컨테이너는 `role="tablist"`, 각 탭은 `role="tab"` + `aria-selected`, 콘텐츠는 `role="tabpanel"` + `aria-labelledby`(연결된 탭 id)로 구성한다. 비활성 탭의 패널은 `hidden`으로 감춘다 — `aria-selected`만으로는 스크린 리더가 패널을 구분하지 못한다.

## Variant 선언

- 변형(variant·size 같은 축)이 있는 컴포넌트는 `@app/design-system`이 내보내는 `tv`(`tailwind-variants`)로 class를 선언한다. 축이 하나뿐이거나 조건이 한두 개인 단순한 class는 `cn`으로 충분하다.
- 조합에만 필요한 예외는 `compoundVariants`로 선언하고, 아이콘·글자처럼 여러 부분이 있으면 `slots`를 쓴다. 호출하는 쪽의 `className`은 `tv` 호출에 넘겨 한 곳에서 병합한다.
- `cn`과 `tv`는 `src/utils/tailwind.ts`의 같은 `tailwind-merge` 설정을 쓴다. `h-s18`, `rounded-r4`, `typography-label-l` 같은 토큰 클래스를 설정에 등록해 두어서 호출하는 쪽의 `h-10` 같은 기본 scale 클래스가 토큰 클래스를 덮어쓴다. 새 spacing·radius·shadow·typography 토큰이 생기면 `tailwind.ts`의 목록을 갱신한다. `tailwind.test.ts`가 `tokens.css`의 이름이 목록에서 빠지면(개수 포함) 실패하게 한다. 목록에만 남은 이름(삭제된 토큰)은 잡지 못하므로 토큰을 지울 때 함께 지운다.
- 선택 근거: `cva`와 `tailwind-variants` 중 slots와 compoundVariants, 내장 병합을 이유로 `tailwind-variants`를 골랐다.
- typography 토큰(`typography-label-l` 등)은 `text-sm` 같은 기본 크기 class와 같은 그룹으로 보지 않는다. 호출하는 쪽이 글자 크기를 바꾸려면 다른 typography 토큰을 넘기고, `text-*` 크기 class로 덮어쓰지 않는다.

## 배치 기준

- Figma에 컴포넌트로 정의된 UI(버튼, 입력, 헤더, 다이얼로그처럼 모양과 상태·접근성 계약을 가진 부품)는 사용처 수와 관계없이 디자인 시스템에 둔다. 두 곳 이상 쓰일 때까지 기다리지 않는다.
- 패키지 안은 두 구역으로 나눈다. 폴더 이름은 그 UI를 쓰는 앱 폴더 이름을 따른다.
  - `src/components/core/`: 모든 앱(web·admin)이 쓰는 기본 부품. 제품 문구·route·데이터를 모른다. 공개 주소는 `@app/design-system`이다.
  - `src/components/web/`: `apps/web` 전용 UI(예: 하단 내비게이션 `BottomNavigation`). BUNCH 사용자 앱의 문구·모양을 가질 수 있다. 공개 주소는 `@app/design-system/web`이고 루트 barrel에는 포함하지 않는다.
- 구역 선택 질문은 하나다. "BUNCH 사용자 앱에서만 의미가 있는가?" 예면 `web`, 아니면 `core`. `web`에서 어드민도 필요해지면 제품 문구를 props로 빼고 `core`로 옮긴다.
- 의존 방향은 한쪽이다. `web`은 `core`를 쓸 수 있고, `core`는 `web`을 import하지 않는다(ESLint `no-restricted-imports`로 검사). `apps/admin`은 `@app/design-system/web`을 import하지 않는다(같은 규칙).
- 두 구역 모두 route, domain data, API, logging을 직접 알지 않는다. 문구·항목·링크·핸들러는 props, slot, callback으로 받는다(예: 하단 내비게이션은 `items`와 현재 항목을 받고 링크를 어떻게 그릴지는 호출자가 넘긴다).
- DS 컴포넌트를 묶어 domain 문구, route, 데이터, 사용자 행동을 붙이는 조합은 앱의 `src/features/<feature>/`에 둔다(예: 탭 4개의 라벨·경로·현재 탭 판정).
- 화면 틀(`AppFrame`, `PageShell`)과 route shell처럼 앱 전용 layout은 디자인 시스템에 두지 않는다.
- 한 화면에서만 쓰는 일회성 배치(Figma 컴포넌트가 아닌 화면 조립)는 DS가 아니라 page·feature 가까이에 둔다.
- 어드민 전용 UI가 DS 수준의 검증(Storybook·Chromatic)이 필요해지면 그때 `src/components/admin/`을 추가한다. 비어 있는 구역은 미리 만들지 않는다.

## 생성 구조

새 컴포넌트는 반드시 `yarn gen:ds-component <PascalCase 이름>`으로 생성하고 구역(`core`/`web`)을 고른다. 직접 만든 폴더는 `yarn check:generated`의 구조 검사(`turbo/workflows/check-ds-components.mjs`)가 CI에서 실패시킨다. 폴더마다 컴포넌트·test·story·`index.ts`가 모두 있어야 한다. 컴포넌트 안에서만 쓰는 hook·헬퍼 파일은 `<이름>.internal.ts`로 만들면 `yarn gen:index`가 barrel에서 빼서 공개 API가 되지 않는다. 이름이 `use`로 시작하는 hook 파일에 `.internal`이 없으면 구조 검사가 실패한다(헬퍼 파일은 검사하지 않으니 직접 지킨다). `src/icons/generated/`의 아이콘은 SVG asset 파이프라인으로 생성하며 `docs/architecture/design-system-icons.md`를 따른다.

```text
packages/design-system/src/components/{core|web}/{component-name}/
  ComponentName.tsx
  ComponentName.test.tsx
  ComponentName.stories.tsx
  index.ts
```

- 컴포넌트와 props type은 explicit export한다.
- Storybook에는 기본 상태와 지원하는 variant·disabled·loading·error·selected 상태를 의미 있게 추가한다.
- 긴 텍스트, overflow, 아이콘 조합처럼 실제로 깨지기 쉬운 상태도 story 또는 테스트로 확인한다.
- public API 또는 export를 바꾸면 `yarn check:generated`를 실행한다.
- button은 native `button`을 사용하고, 텍스트 없는 interactive element에는 accessible name을 제공한다.
- 아이콘만 있는 interactive element는 보이는 아이콘 크기보다 큰 터치 영역을 제공한다. 크기별 값은 `docs/architecture/design-system-icons.md`의 "크기와 터치 영역"을 따른다.
- 내부 helper와 앱 전용 adapter는 public export로 노출하지 않는다.
- Story에는 route, API request, analytics, domain fixture를 직접 넣지 않는다. state matrix는 component prop으로 재현 가능해야 한다.
- 새 컴포넌트는 구현 전에 `.agents/templates/component.spec.md`로 가까운 `<이름>.spec.md` 초안을 쓴다(목적, 사용 위치, public props, 지원·비지원 상태, styling/token, 접근성). 확인되지 않은 항목은 `확인할 항목`에 남기며, 초안을 합의한 뒤 구현한다. 기존 컴포넌트의 public API 변경도 `docs/workflows/spec-writing.md`에 따라 spec을 먼저 갱신한다.
  검증 항목은 실제로 실행한 뒤에만 체크한다.
- public export는 소비자가 필요로 하는 component와 props type만 노출한다. 내부 helper, adapter, test fixture는 package 내부에 남긴다.
- 새 primitive는 keyboard, focus, disabled, loading, invalid, selected와 긴 텍스트·작은 viewport·icon-only 조합 중 해당 상태를 story 또는 test로 검증한다.

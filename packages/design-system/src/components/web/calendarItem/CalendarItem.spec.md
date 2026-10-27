# 컴포넌트: CalendarItem

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Calender Item`(node `1577:13366`). 변형은 `State=Active·Pressed·Selected·Disabled·hidden` 5개다.

## 목적과 범위

### 제공하는 동작

- 캘린더 한 칸에 날짜 하나를 보여 주는 46px 원형 버튼. `Calendar`가 달의 날짜마다 하나씩 쓴다.

### 제공하지 않는 동작

- 오늘 표시, 점·이벤트 표시, 기간 선택(시작·끝·구간)은 Figma에 없어서 만들지 않았다.
- Selected의 눌림은 Figma에 없다(Pressed는 선택되지 않은 칸에만 있다).

## Public API

- Props: `children`(날짜 글자), `selected`(기본 `false`), `disabled`(기본 `false`), `hidden`(기본 `false`), 그리고 native `<button>`의 속성(`type`·`disabled`·`hidden`은 제외, `className`·`onClick`·`aria-*`·`data-*` 등).
- 이벤트: native `onClick`. `disabled`면 호출하지 않는다. Controlled / uncontrolled: 해당 없음(선택 값은 호출하는 쪽이 보관).
- 글자 크기: `typography-body-1-medium`(16/24, 자간 -0.25px)으로 고정.
- 호출자 소유 책임: 날짜 글자(i18n·숫자 형식), 선택 값, `aria-selected` 같은 선택 표시(`Calendar`는 gridcell에 둔다).

## 상태와 동작

- Active(기본): 흰 배경(`surface-primary`) + `text-primary` 글자, 원형(`rounded-full`), 46×46px(`size-11.5`).
- Pressed(`:active`): 칸 위에 `overlay-hover`(검정 10%)를 얹어 글자까지 어두워진다. `disabled`와 `selected`에는 적용하지 않는다.
- Selected: `surface-inversed` 배경 + `text-inversed` 글자.
- Disabled: `text-quaternary`(`#BCBEC2`) 글자와 `cursor-not-allowed`. 네이티브 `disabled`가 아니라 `aria-disabled`라 포커스는 받고 눌러도 `onClick`이 호출되지 않는다(캘린더 격자에서 키보드가 이 칸을 건너뛰지 않게 하려는 처리). 선택된 칸이 비활성이면(예: 선택된 날짜가 `minDate` 밖) 선택 모양(어두운 배경에 흰 글자)을 유지하고 `aria-disabled`와 `cursor-not-allowed`만 적용한다(Figma에 없는 조합).
- hidden: 버튼 없이 같은 크기의 빈 칸(`aria-hidden`)만 그린다. 다른 달의 칸처럼 자리만 차지하는 용도다.

## 접근성

- Semantic element: `<button type="button">`. hidden은 `<span aria-hidden>`.
- Accessible name·label: 날짜 글자(`children`)가 이름이다. "2026년 10월 20일"처럼 더 긴 이름이 필요하면 `aria-label`을 준다(`Calendar`는 이 이름을 준다).
- Keyboard·focus: Tab·Enter·Space로 누른다. 포커스는 칸 바깥 2px `border-brand` 윤곽선이다. 칸들이 붙어 있어 윤곽선이 뒤에 오는 이웃 칸의 배경에 가려질 수 있으므로 포커스된 칸을 `z-10`으로 올려 가려지지 않게 했다.
- 색 대비(토큰 hex로 계산): Active `#121212` on `#FFFFFF` 18.7:1, Selected `#FFFFFF` on `#25282D` 14.8:1로 통과한다. Disabled `#BCBEC2` on `#FFFFFF`는 1.9:1로 낮지만 비활성은 대비 요구에서 제외된다.

## Styling과 의존성

- Token: `bg-surface-primary`·`bg-surface-inversed`, `text-text-primary`·`text-text-inversed`·`text-text-quaternary`, `bg-overlay-hover`, `typography-body-1-medium`. 허용되는 dependency 추가 없음.
- Figma 이름 대응: `State=Active·Pressed·Selected·Disabled·hidden`→기본·`:active`·`selected`·`disabled`·`hidden`, `date`→`children`.
- Storybook state matrix: `Default`, `Selected`, `Disabled`, `Hidden`, `States`.

## 확인할 항목

- 글자색: Figma Active·Pressed 글자는 변수가 아니라 순수 검정(`#000`)이라 가장 가까운 `text-primary`(`#121212`)를 썼다. 디자이너 확인 항목이다.
- Disabled 글자는 Figma의 `text-quinary`(`#BCBEC2`)이고 repo에서는 같은 값의 `text-quaternary`다(repo 토큰 번호가 Figma보다 하나 낮음).
- Pressed의 배경은 Figma에서 흰 바탕 위의 검정 오버레이로 그려져 있어 repo의 `overlay-hover`로 옮겼고, 같은 오버레이로 그려진 `IconButton`의 Pressed를 픽셀로 재 보니 10%(`#E5E5E5`)였다. 다른 버튼과 같은 75ms ease-out 전환(동작 줄이기에서는 끔)을 적용했다.

## 검증

단위 테스트(상태별 클래스, 클릭, `aria-disabled`와 포커스, hidden)와 `Calendar` 안에서의 Storybook 렌더로 크기(46×46)·배경·글자 스타일(16/24, 500, 자간 -0.25)을 Figma 값과 대조했다. 눌림의 실제 색, 스크린 리더, 실기기 터치, 강제 색상 모드는 확인하지 않았다.

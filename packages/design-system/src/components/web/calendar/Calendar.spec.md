# 컴포넌트: Calendar

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Calender`(node `1601:13761`, 섹션 `1853:26817`). 날짜 칸은 `Calender Item`(node `1577:13366`)이다.
- 의존: `CalendarItem`, `IconButton`(헤더 화살표), 아이콘 `LineChevronLeftLargeIcon`·`LineChevronRightLargeIcon`. 라이브러리(`react-day-picker` 등)는 쓰지 않고 `Date`로 직접 계산한다.

## 목적과 범위

### 제공하는 동작

- 한 달 보기에서 날짜 하나를 고르는 캘린더. 위에 이전·다음 달 화살표와 "{연}년 {월}월" 제목, 그 아래 요일 줄(Su~Sa)과 날짜 격자가 있다.
- 최소·최대 날짜와 날짜별 규칙으로 고를 수 없는 날을 정한다.
- 키보드로 격자를 옮겨 다닌다.

### 제공하지 않는 동작

- 기간(범위) 선택, 여러 날짜 선택, 연·월 드롭다운, 주 시작 요일 바꾸기, 오늘 표시는 Figma에 없어서 만들지 않았다.
- 이전·다음 달 화살표의 비활성 모양은 Figma에 없어 최소·최대 날짜를 넘어도 화살표는 계속 눌린다.
- 헤더의 화살표 버튼은 Figma의 `Icon Button`(Subtle)이며 이슈 #86의 `IconButton`을 그대로 쓴다(같은 PR에서 함께 만들었다).

## Public API

- Props: `selected`(선택된 날짜, 기본 없음), `onSelectDate`, `defaultMonth`, `onMonthChange`, `minDate`, `maxDate`, `isDateDisabled`, `weekdayLabels`(일요일부터 7개를 주어야 하고 기본은 Figma의 `Su Mo Tu We Th Fr Sa`, 7개를 넘는 글자는 버린다), `previousMonthLabel`·`nextMonthLabel`(화살표 접근성 이름, 기본 "이전 달"·"다음 달"), `formatMonth`(제목, 기본 "2026년 10월"), `formatDate`(날짜 버튼의 접근성 이름, 기본 "2026년 10월 20일"), 그리고 native `<div>`의 속성(`className`은 캘린더에 적용).
- 선택은 controlled다: `selected`는 호출하는 쪽이 보관하고 `onSelectDate`에서 바꾼다. 보이는 달은 내부 state이고 `defaultMonth`로 시작 달을 정하며 바뀔 때 `onMonthChange`(각 달의 1일)를 부른다.
- 시작 달: `defaultMonth` → 선택된 날짜의 달 → 오늘이 있는 달. 마지막은 서버와 브라우저의 날짜(시간대 차이 때문에 매월 말·초에 달이 다를 수 있다)가 다르면 hydration 불일치가 날 수 있어 SSR 화면에서는 `defaultMonth`를 주는 편이 안전하다.
- 호출자 소유 책임: 선택 값, 날짜·요일의 i18n, 폭(기본은 부모를 채우고 격자는 322px 가운데), 달 이동에 따른 데이터 로딩.

## 상태와 동작

- 레이아웃: 배경 `surface-primary`, 좌우 여백 16px(`padding-p8`), 요소 간격 24px(`s12`). 헤더(40px 높이) → 격자(요일 줄 21px + 날짜 줄 46px씩)이며 5주 달은 높이가 315px이다.
- 헤더: 화살표 40px 원(`IconButton` subtle, 눌림은 `IconButton` spec을 따름)과 가운데 제목(`typography-heading-2-semibold`, 18/27, 자간 -0.5px).
- 요일 줄: 칸 46px, `typography-body-2-regular`(14/21), `text-tertiary`.
- 날짜 칸: `CalendarItem`. 그 달의 앞뒤 빈 칸은 `hidden` 칸으로 자리만 채운다(줄은 항상 7칸).
- Selected: 선택된 날짜 하나만 어두운 원이다. 다른 달로 넘어가면 그 달에 선택된 날짜가 없으므로 표시도 없다.
- Disabled: `minDate`보다 이른 날, `maxDate`보다 늦은 날, `isDateDisabled`가 `true`인 날. 눌러도 `onSelectDate`를 부르지 않는다.
- 달 이동: 화살표 또는 PageUp·PageDown. 13월은 다음 해 1월, 0월은 전 해 12월로 넘어간다.

## 접근성

- Semantic element: `role="grid"`(제목으로 이름), 요일 줄과 날짜 줄은 `role="row"`, 요일은 `columnheader`, 날짜는 `gridcell`(`aria-selected`)과 그 안의 버튼이다. 달 제목은 `aria-live="polite"`라 달이 바뀌면 읽힌다.
- Keyboard·focus: 격자에는 Tab으로 한 칸(마지막으로 옮긴 날, 없으면 선택된 날, 없으면 그 달 1일)만 들어간다. 방향키는 하루·일주일, Home·End는 그 주의 일요일·토요일, PageUp·PageDown은 한 달, Shift를 함께 누르면 한 해를 옮긴다. 달이 넘어가면 그 달로 따라가며 포커스를 주고 `onMonthChange`도 부른다. 고를 수 없는 날도 포커스는 받는다. Alt·Ctrl·Meta와 함께 누른 키는 브라우저·운영체제 단축키(Alt+방향키 등)라 가로채지 않는다.
- 날짜 버튼은 보이는 글자는 일 숫자이고 접근성 이름은 "2026년 10월 20일"이라 버튼 목록·음성 제어에서도 구별된다. 선택은 gridcell의 `aria-selected`, 고를 수 없음은 `aria-disabled`가 전한다.
- 화살표 버튼은 "이전 달"·"다음 달"이라는 이름이 있고 아이콘은 `aria-hidden`이다.
- 요일 글자는 영어 줄임말(`Su`~`Sa`)이 디자인 의도다(디자이너 확인). 스크린 리더가 "수"처럼 읽을 수 있고 전체 요일 이름(예: "일요일")을 읽히게 하는 prop은 만들지 않았다.
- 달 제목은 `aria-live="polite"`라 화살표로 달을 옮기면 읽히지만, PageUp·PageDown은 포커스가 새 날짜로 옮겨 가며 그 이름이 읽혀 제목 낭독과 겹칠 수 있다(스크린 리더로 확인 필요).
- 색 대비(토큰 hex로 계산): 제목 `#121212` on `#FFFFFF`, 날짜 Active `#121212`·Selected `#FFFFFF` on `#25282D`는 통과한다. 요일 `#535A61` on `#FFFFFF`는 7.0:1로 통과한다.

## Styling과 의존성

- Token: `bg-surface-primary`, `px-padding-p8`·`gap-s12`, `text-text-primary`·`text-text-tertiary`, `typography-heading-2-semibold`·`typography-body-2-regular`, `bg-overlay-hover`. 날짜 칸의 token은 `CalendarItem` spec을 따른다.
- 허용되는 dependency 추가 없음.
- Figma 이름 대응: `Calender`→`Calendar`, `Calender Item`→`CalendarItem`, 헤더의 `Icon Button`→`IconButton`(subtle), `Td`→요일 칸.
- Storybook state matrix: `Default`, `Interactive`, `DisabledDates`, `KoreanWeekdays`.

## 확인할 항목

- Figma 샘플 달력은 제목이 "2026년 10월"인데 1일이 화요일에 놓여 있다. 실제 10월 1일은 목요일이라 구현은 `Date`로 계산한 실제 달력(1일이 목요일)을 그린다. 이 샘플은 12월의 배치와 같다.
- 색: 제목 `#1e1e1e`와 요일 `#757575`는 Figma의 `sds` 기본 색(repo에 없는 변수)이라 가장 가까운 `text-primary`(`#121212`)와 `text-tertiary`(`#535A61`)를 썼다. 디자이너 확인이 필요하다.
- 6주가 필요한 달(예: 일요일에 시작하는 31일 달)의 높이는 Figma에 없다. 구현은 줄이 늘어나 높이가 346px이 된다.

## 검증

단위 테스트로 달 제목·요일·날짜 수, 앞뒤 빈 칸, 달 이동(해 넘김 포함), 선택, 고를 수 없는 날, 방향키·Home·End·PageUp·PageDown·Shift+PageUp·Shift+PageDown 포커스 이동, 달을 넘어가는 이동(`onMonthChange` 포함), Alt·Ctrl·Meta 조합을 가로채지 않는 것, 날짜 접근성 이름, 이름·제목 prop을 확인했다. Storybook을 빌드해 `Default`의 치수와 스타일을 Figma와 대조했다: 캘린더 375×315, 헤더 버튼 40px(16과 319에 위치), 격자 322px(가로 26.5), 요일 칸 46×21, 날짜 줄 46px, 선택 칸 `#25282D` 배경에 흰 글자 16/24 Medium, 제목 18/27 SemiBold 자간 -0.5. 글자 픽셀은 Pretendard가 없어 비교하지 않았고 Figma 샘플의 요일 배치가 실제 달력과 달라 날짜 격자의 픽셀 비교도 하지 않았다. 대신 Storybook에서 달을 옮겨 가며 첫 주의 칸 위치를 쟀다: 2026년 10·11·12월과 2027년 1월의 1일이 목·일·화·금 열(x 184·0·92·230)에 놓이고, 모든 줄이 46px 칸 7개이며 6주 달(2027년 1월)의 격자 높이는 297px(요일 줄 21 + 46×6)이다. 빈 칸이 inline 요소라 폭이 0으로 접혀 1일이 일요일 열로 밀리던 문제는 `block`으로 고쳤다. 스크린 리더(grid 낭독), 키보드 포커스 윤곽선의 실제 모양, 실기기 터치, 강제 색상 모드는 확인하지 않았다.

# 컴포넌트: DatePickerField

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #595)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Date Picker Text Field`(node `8111:91950`). 달력은 core `Calendar`(Figma `Calender`, 같은 컴포넌트)를 쓴다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 날짜 하나를 고르는 입력칸. 누르면 아래에 달력이 열린다(Figma Focused·Selected). 고른 날짜는 칸에 표시된다(Filled).
- 직접 입력도 받는다(2026-11-27 사용자 결정). `2026.11.25`, `2026-11-25`, `2026 11 25`, `20261125`, 표시 글자 `2026.11.25(수) 00:00`처럼 앞부분의 연·월·일을 읽는다.

### 제공하지 않는 동작

- 시간 선택은 없다. 「00:00」·「23:59」 같은 표시 규칙은 호출자가 `formatValue`로 정한다(2026-11-27 사용자 결정).
- 기간 선택(시작·종료 한 번에)은 없다. 화면이 입력칸 두 개를 둔다.
- 「1주·2주·4주」 빠른 선택은 화면 요소다.

## Public API

- Props: `value`(`Date | null`), `onValueChange`, `formatValue`(기본 `2026.11.25`), `placeholder`, `invalidInputMessage`(되돌렸을 때 낭독할 글자), `calendarLabel`(필수, 달력 팝업 이름), `minDate`, `maxDate`, `isDateDisabled`, `disabled`, `className`(바깥 상자), `aria-label` 또는 `aria-labelledby`(필수).
- Controlled / uncontrolled: controlled.
- 호출자 소유 책임: 선택 값, 표시 규칙(요일·시간), 안내 글자, 고를 수 있는 기간. 바깥 상자가 `<label>`이라 다시 `<label>`로 감싸지 않고 보이는 라벨은 `aria-labelledby`로 연결한다.

## 상태와 동작

- Default: 안내 글자 `body-3-semibold` `text-quinary`, 테두리 `border-secondary`.
- 열림(Figma Focused·Selected): 테두리 `border-strong`, 아래 8px에 입력칸 폭으로 달력. 입력칸 최소 폭은 달력 폭(354px)이라 좁은 자리에서도 달력이 잘리지 않는다(2026-11-27 사용자 결정).
- Filled: 글자 `body-3-regular` `text-primary`.
- 직접 입력: 입력 중에는 친 글자를 그대로 보여 주고, 칸을 벗어나거나 Enter일 때 해석한다. 해석할 수 없거나 고를 수 없는 날(최소·최대·`isDateDisabled`)이면 `onValueChange`를 부르지 않고 이전 값으로 되돌린다. 모두 지우면 `null`을 알린다.
- 달력에서 날짜를 누르면 값을 알리고 닫고 입력칸으로 초점을 되돌린다.
- Disabled: 흐림 40%, `cursor-not-allowed`(Figma에 없어 다른 어드민 입력과 맞춤).
- Esc: 입력 중인 글자를 버리고 이전 값을 유지하며 닫는다. 입력칸을 다시 누르는 것은 바깥 누름으로 보지 않는다(입력 중 확정되지 않음). Enter로 닫은 뒤 다시 입력하면 달력이 다시 열린다.

## 접근성

- 입력칸: `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`(열렸을 때 달력).
- 달력 팝업: Base UI Popover(`dialog`), 이름은 `calendarLabel`. 열어도 초점은 입력칸에 둔다(바로 입력). ↓ 키로 열거나 열린 상태에서 ↓면 날짜 격자로 초점 이동. 닫는 순간 초점이 달력 안에 있을 때만 입력칸으로 되돌린다(다른 칸을 눌러 닫히면 그 칸의 초점을 빼앗지 않음).
- 달력 격자의 키보드 이동은 core `Calendar`가 맡는다.

## Styling과 의존성

| Figma 값                                                                                      | 토큰·클래스                                                                                           |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 바탕 `surface-primary`, 테두리 `border-secondary`(열림 `border-strong`), `radius-r5`, 높이 47 | `bg-surface-primary border border-border-secondary data-open:border-border-strong rounded-r5 h-11.75` |
| 좌우 `padding-p8`(16)                                                                         | `px-padding-p8`                                                                                       |
| 입력칸·달력 간격 `spacing-s4`(8)                                                              | Popover `sideOffset={8}`                                                                              |
| 달력 `radius-r5`, 그림자 4 4 2 검정 10%                                                       | `rounded-r5 drop-shadow-[4px_4px_2px_rgba(0,0,0,0.1)]`(토큰 없음)                                     |

- 허용되는 dependency: `@base-ui/react`(Popover), core `Calendar`. 날짜 해석은 `DatePickerField.internal.ts`(공개하지 않음).
- Storybook state matrix: `Default`, `Period`(시작 00:00·종료 23:59, 종료일 최소값 = 시작일), `Disabled`.

## 모션

- 펼침(2026-11-27 사용자 결정, 어드민 Figma에 모션이 없어 `Dropdown`과 같은 값): 입력칸 쪽에서 scale 0.9→1·투명도 0→1, 150ms ease-out. 닫기는 1→0.9·1→0, 100ms ease-in. 기준점은 Base UI `--transform-origin`. Base UI `data-starting-style`·`data-ending-style` + CSS transition(`scale`·`opacity`).
- 동작 줄이기: 크기 변화를 빼고 투명도만 바뀐다.

## 확인할 항목

- 잘못 입력했을 때 (제안): Figma에 오류 모양이 없어 화면은 이전 값으로 되돌리고, `invalidInputMessage`가 있으면 항상 있는 `role="status"`로 낭독한다. 같은 잘못을 반복해도 다시 읽히게 비웠다가 넣는다. 오류 모양이 정해지면 추가한다.
- 달력 그림자 (확정): 토큰이 없어 Figma 값을 그대로 쓴다(2026-11-27 사용자).
- 포커스 윤곽 (확정): Figma에 없어 `outline-border-brand` 2px을 더하되, Tab 등 키보드로 들어왔을 때만 켠다. 마우스로 누르면 커서와 열림 테두리만 보인다(2026-11-27 사용자).

## 검증

- [x] 사용자 관찰 동작 test(날짜 해석·뒤 숫자 거절, 표시 규칙, 달력에서 고르기·닫기·초점 복귀, 직접 입력, 잘못된 입력 되돌림·알림, 비우기, Esc 취소, ↓ 격자 초점)
- [x] 지원 variant·edge state story
- [x] public export 영향 확인(해석 함수는 internal로 공개 제외)
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교, 다른 입력칸으로 옮겨 갈 때 초점·재열림 확인

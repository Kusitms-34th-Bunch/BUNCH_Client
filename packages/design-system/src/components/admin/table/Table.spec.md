# 컴포넌트: Table

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #592)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Table Row/Type`(node `7782:38254`), `Table Row/Status`(node `7782:38648`). 표 틀·열 제목 줄·구분선은 화면설계서 `번치 스팟 관리`(node `8377:126100`)에서 가져왔다.
- 이름: Figma는 행만 컴포넌트로 두었다. 코드는 표 전체를 Compound(`Table.Root` 등)로 묶는다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 어드민 목록 표: 표 틀, 열 제목 줄, 행, 칸, 행을 여는 버튼.
- 행 상태: Default, Hover, Selected(열린 상세의 행), Disabled.
- 행 위아래 여백 2가지: 썸네일 있는 행 `media`(Figma Type 01), 글자만 있는 행 `text`(Type 02·03).

### 제공하지 않는 동작

- Figma Type 01~03의 열 구성(번치 스팟·회원·신고)은 만들지 않는다. 화면의 feature가 `columns`와 칸으로 조합한다(2026-11-27 사용자 결정). Storybook에 Type 01·03 조합 예시를 둔다.
- 정렬, 페이지 이동, 빈 목록·불러오는 중 모양은 없다. 화면에서 정한다.
- 행 썸네일 이미지는 칸 내용이라 호출자가 넣는다.

## Public API

- `Table.Root`: `columns`(CSS `grid-template-columns`, 열 제목 줄과 모든 행이 같은 값을 씀), `columnGap`(`default` 20px | `none` 0), `aria-label` 또는 `aria-labelledby` 필수, `className`.
- `Table.Header`, `Table.Body`: 열 제목 줄과 행 묶음. `className`을 받는다.
- `Table.HeaderCell`, `Table.Cell`: `align`(`start` 기본, 숫자 열은 `end`), `className`. `Table.Cell`은 `interactive`도 받는다. 칸 안에 링크·버튼이 있으면 `interactive`를 줘야 행 버튼 누름 영역에 가려지지 않는다. 비활성 행에서도 `interactive` 칸 안 버튼은 눌리므로 호출자가 직접 `disabled` 처리한다.
- `Table.Row`: `selected`, `disabled`, `variant`(`media` 기본 | `text`), `className`.
- `Table.RowButton`: native `<button>` 속성(`onClick`, `className` 등). `disabled`·`type`·`aria-current`는 행 상태가 정해 받지 않는다. 행의 대표 칸 안에 둔다.
- 호출자 소유 책임: 열 폭, 칸 내용과 글자 모양, 열린 행 판정, 행을 누르면 할 일(상세 열기). 행이 0개면 `Table.Body`를 그리지 않고 빈 목록 안내를 따로 그린다(row 없는 rowgroup 방지). 칸 안에서 여는 팝오버·드롭다운은 포털로 띄운다(`Table.Root`가 `overflow-clip`). `Table.Body` 좌우 여백을 2px 미만으로 줄이지 않는다(행 초점 윤곽이 잘림).

## 상태와 동작

- Default: 바탕 `surface-primary`, 기본 글자 `body-2-regular` `text-secondary`.
- Hover(Default 행 중 행 버튼이 있는 행만): `overlay-hover` 덮개를 썸네일·배지까지 덮는다. 누를 수 없는 행은 Hover 모양이 없다.
- Selected: `overlay-pressed` 덮개. Hover 모양은 없다.
- Disabled: 행 전체 흐림 40%, 행 버튼을 누를 수 없다.
- 행 사이 구분선: 행 간격(12px) 가운데, 좌우 10px 안쪽에 1px `border-tertiary`. 마지막 행은 없다.
- 열 간격: Figma 화면 표는 묶음 안 20px, 묶음 사이는 남는 폭이라 간격이 일정하지 않다. 이 경우 `columnGap="none"`으로 두고 열 폭에 뒤 간격을 포함해 Figma 행의 시작 위치를 그대로 재현한다. 말줄임 칸은 `pe-s10`으로 다음 열과 20px을 띄운다.
- 칩 열 제목: 열 폭이 칩보다 넓으면 제목을 칩과 같은 폭의 가운데에 둔다(Storybook `ChipHeader` 예시: 제목을 칩 폭의 `inline-block text-center` span에 넣음, 2026-11-27 사용자 요청). 화면마다 반복되면 `HeaderCell`의 prop으로 올린다.
- 긴 글자: 칸은 항상 열 폭을 채우고(`min-w-0`) 호출자가 `truncate`로 말줄임한다. `align`은 글자·flex 정렬만 바꾼다. 칸 폭을 줄이는 정렬(`justify-self`)을 쓰면 칸이 글자 길이만큼 늘어나 옆 칸으로 넘친다(2026-11-27 Storybook에서 확인 후 수정).

## 접근성

- Semantic element: ARIA 표(`role="table"`·`rowgroup`·`row`·`columnheader`·`cell`). 행에 둥근 모서리·간격·구분선을 그리려고 `div` 격자에 역할을 붙였다. 스크린 리더는 칸을 열 제목과 함께 읽는다.
- 행 열기: 대표 칸의 `Table.RowButton` 하나만 Tab 순서에 들어간다. 누름 영역은 행 전체로 넓혔다(가상 요소). 행마다 버튼 하나라 키보드 이동이 단순하다(2026-11-27 사용자 결정).
- 열린 행: 행 버튼이 `aria-current="true"`로 알린다. 색만으로 전달하지 않는다.
- 비활성 행: 행에 `aria-disabled="true"`, 버튼은 `disabled`.
- 포커스 윤곽: 행 버튼의 초점 윤곽을 행 테두리(`outline-border-brand` 2px)에 그린다.
- 층: 행은 `isolate`라 덮개(z-10)·누름 영역(z-20)·`interactive` 칸(z-30)이 행 밖 팝오버와 겹치지 않는다.

## Styling과 의존성

| Figma 값                                                                                                           | 토큰·클래스                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 표 틀 테두리 `border-secondary` 1px, `radius-r4`, 아래 `spacing-s6`                                                | `border border-border-secondary rounded-r4 pb-s6`                                                                                                  |
| 열 제목 줄과 행 묶음 간격 `spacing-s4`                                                                             | `gap-s4`                                                                                                                                           |
| 열 제목 줄 바탕 `surface-tertiary`, 위아래 `padding-p6`(12). 좌우는 행과 같은 겹(`padding-p7` 14 + `padding-p4` 8) | `bg-surface-tertiary px-padding-p7` > `px-padding-p4 py-padding-p6`                                                                                |
| 열 제목 `Body-3-Regular` `text-secondary`                                                                          | `typography-body-3-regular text-text-secondary`                                                                                                    |
| 행 묶음 좌우 `padding-p7`(14), 위아래 `padding-p2`(4), 행 간격 12(행·구분선·행 사이 `spacing-s3` 6씩)              | `px-padding-p7 py-padding-p2 gap-s6`                                                                                                               |
| 행 바탕 `surface-primary`, `radius-r3`, 좌우 `padding-p4`(8)                                                       | `bg-surface-primary rounded-r3 px-padding-p4`                                                                                                      |
| 행 위아래 Type 01 `padding-p3`(6), Type 02·03 `padding-p5`(10)                                                     | `py-padding-p3` / `py-padding-p5`                                                                                                                  |
| 칸 간격 `spacing-s10`(20)                                                                                          | `gap-s10`                                                                                                                                          |
| Hover `overlay-hover`, Selected `overlay-pressed`, Disabled `opacity-disabled`                                     | `has-data-table-row-button:hover:before:bg-overlay-hover`(행 버튼 있는 행만), `before:bg-overlay-pressed`, `opacity-(--semantic-opacity-disabled)` |
| 구분선 #EAEAEA 1px, 행 간격(12px) 가운데·좌우 10px 안쪽                                                            | `after:bg-border-tertiary after:h-px after:bottom-[-6.5px] after:inset-x-2.5`                                                                      |

- 허용되는 dependency: `tailwind-variants`, React context(행 상태를 행 버튼에 전달).
- Storybook state matrix: 화면설계서 표 3개를 그대로 재현한 `SpotList`(번치 스팟 관리, node `8273:145344`, 누르면 Selected 이동), `MemberList`(회원 조회 및 정지, `8273:147324`), `ReportList`(신고 조회 및 처리/접수, `8273:145491`, 신고 수 많으면 `system-fail-text`), `StatusMatrix`(Disabled·Default·Selected). story에 화면 데이터 배열을 넣은 것은 Figma 표와 비교할 수 있게 해 달라는 사용자 요청에 따른 예외다(2026-11-27). 실제 화면의 열 구성은 feature가 따로 만든다.

## 확인할 항목

- 열 제목 줄과 행 내용의 시작 위치 (확정): Figma는 열 제목 좌우 18px, 행 내용 22px(묶음 14 + 행 8)이라 칸이 4px 어긋난다. 열 제목 줄도 행과 같은 겹(14 + 8)으로 두어 모든 열을 맞췄다(2026-11-27 사용자 확인). 열 제목 글자는 Figma보다 4px 오른쪽이다.
- Disabled 행의 쓰임 (미정): 화면설계서에서 Disabled 행이 쓰인 화면을 찾지 못했다. 모양만 제공한다.
- 고대비 모드 (제안): Windows 고대비(forced-colors)에서는 덮개 배경이 사라져 Selected가 `aria-current`로만 전달된다. 어드민 사용 환경에서 필요해지면 윤곽으로 대체한다.
- 행 썸네일 이미지 (제안): Figma 썸네일은 48px `radius-r2`이다. 칸 내용이라 화면을 만들 때 feature가 넣는다.

## 검증

- [x] 사용자 관찰 동작 test(표 역할·열 제목, 행 버튼 클릭, 여러 행 중 열린 행만 aria-current, interactive 칸 층, 비활성). interactive 칸의 실제 클릭 가로채기는 테스트 DOM이 레이아웃을 계산하지 않아 브라우저 확인 항목
- [x] 지원 variant·edge state story
- [x] public export 영향 확인(`@app/design-system/admin`, `yarn gen:index`)
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit`, `check:tailwind` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교

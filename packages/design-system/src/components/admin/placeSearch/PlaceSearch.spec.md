# 컴포넌트: PlaceSearch

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #595)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Place Search`(node `7673:34130`). 화면설계서 「번치 스팟 등록」의 장소 정보에서 쓴다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 라벨(필수 별표) + 검색 입력 + 결과 목록 + 고른 장소 칸.
- 상태: Default, Focused, Disabled, Loading(스켈레톤), Results, No Results(안내 + 직접 입력), Selected(장소 칸 + 「변경」).
- 결과 이름에서 검색어와 같은 부분을 굵게 보여 준다.

### 제공하지 않는 동작

- 검색 요청·디바운스·결과 관리는 하지 않는다. 호출자가 `query`로 검색해 `status`·`results`로 넘긴다(2026-11-27 사용자 결정).
- 직접 입력 화면은 없다. 「직접 입력하기」를 누르면 콜백만 부른다.

## Public API

- Props: `label`, `required`, `query`, `onQueryChange`, `status`(`idle`·`loading`·`results`·`empty`), `results`(`{ id, name, category?, address }[]`), `onSelect`, `selected`(`{ name, address }`), `onChangeSelected`, `changeLabel`(기본 「변경」), `placeholder`, `emptyTitle`, `emptyDescription`, `manualInput`(`{ label, onClick }`), `loadingLabel`, `formatResultsLabel`(결과 건수 낭독 글자), `formatSelectedLabel`(선택 낭독 글자), `disabled`, `className`.
- Controlled / uncontrolled: controlled(검색어·고른 장소).
- 호출자 소유 책임: 검색 요청과 상태, 문구, 고른 장소 보관, 「변경」·「직접 입력하기」 동작. 검색어가 비면 `status`를 `idle`로 둔다(남겨 두면 「변경」 뒤 비운 채 벗어나도 고른 장소로 되돌리지 않음). form 안에서 쓰면 가리킨 결과가 없을 때 Enter가 form을 제출하므로 화면에서 막는다(Base UI inline 동작).

## 상태와 동작

- 입력칸 아래 8px에 **패널 자리 하나**를 두고 내용만 바꾼다(Figma: 라벨 → 입력칸 → 패널이 문서 흐름으로 쌓임, 2026-11-27 사용자 결정).
  - 검색 중(`status`가 `idle`이 아니고, 고른 장소가 없거나 고른 뒤 사용자가 검색어를 다시 입력함): 받는 중(core `Skeleton` 막대 3쌍, 동작 줄이기면 깜빡임 멈춤) → 결과(가리키면 `surface-secondary`) 또는 결과 없음(안내 + 직접 입력 버튼).
  - 그 밖에 고른 장소가 있으면 장소 칸(Selected). 고른 뒤 다시 열려도 장소 칸이다. 「다시 입력함」은 고르기·Esc·바깥에서 `selected`가 바뀔 때 풀린다(이름 비교가 아니라 입력 여부로 판단해 같은 이름의 다른 지점도 다시 입력하면 고를 수 있음). `selected` 변경은 객체 참조가 아니라 이름·주소 값으로 판단해, 호출자가 렌더마다 새 객체를 넘겨도 다시 입력 중인 검색 패널이 유지된다.
- 결과를 고르면 입력칸에 장소 이름이 들어가고(`onQueryChange`) `onSelect`를 부른다. 패널은 장소 칸으로 바뀐다. `formatSelectedLabel`이 있으면 고른 장소를 낭독한다(같은 장소를 다시 골라도 읽히게 비웠다가 넣음, 다시 입력·Esc·「변경」이면 비움).
- 「변경」을 누르면 입력칸을 비우고 초점을 주며, 고른 장소 칸을 숨긴다. 고른 값은 새로 고를 때까지 유지한다. 새로 입력하면 검색 패널로 바뀌고, 입력 없이 벗어나거나 Esc를 누르면 고른 장소 이름과 장소 칸으로 되돌린다(빈 입력칸과 고른 값이 어긋나지 않게, 2026-11-27 사용자 결정). 검색 패널이 보이는 동안(호출자가 빈 검색어에도 결과를 남긴 경우)은 벗어나도 되돌리지 않는다. 되돌리면 `formatSelectedLabel`로 고른 장소를 다시 알린다.
- 목록은 팝업이 아니라 Base UI Combobox `inline` 모드로 문서 흐름에 그린다. inline이라 바깥 누름으로 닫히지 않는다.
- Esc: 다시 입력하는 중(검색어 입력·「변경」) 고른 장소가 있으면 그 이름으로 되돌려 장소 칸으로 돌아간다. 고른 장소가 없으면 아무 일도 하지 않는다.
- 긴 이름·주소는 한 줄 말줄임.

## 접근성

- Base UI Combobox: 입력칸 `combobox`, 결과 `listbox`/`option`, 방향키로 결과 이동·Enter로 선택. inline이라 Base UI가 입력칸을 늘 펼쳐짐으로 표시해, 실제로 결과 목록이 보일 때만 `aria-expanded="true"`로 덮어쓴다.
- 라벨은 `<label for>`로 입력칸에 연결. 필수는 별표(장식) + `aria-required`.
- 받는 중·결과 건수·결과 없음은 항상 있는 `Combobox.Status`(`role="status"`)의 글자만 바꿔 알린다. 검색 중일 때만 글자를 넣는다(고른 장소 칸을 보여 줄 때는 비움).
- 비활성(`disabled`)이면 입력칸과 함께 「변경」·「직접 입력하기」 버튼도 비활성이다(#600 리뷰).
- 입력칸 윤곽(`outline-border-brand` 2px)은 Tab 등 키보드로 들어왔을 때만 켠다(SearchBar와 같음).
- 결과 없음 패널도 같은 자리라 Tab으로 「직접 입력하기」에 닿는다. 누르면 초점을 입력칸으로 옮긴다.

## Styling과 의존성

| Figma 값                                                                                                            | 토큰·클래스                                                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 라벨 `Body-3-Semibold` `text-secondary`, 별표 `icon-brand`                                                          | `typography-body-3-semibold text-text-secondary`, `text-icon-brand`                                        |
| 라벨·입력·장소 칸 간격 `spacing-s4`(8)                                                                              | `gap-s4`                                                                                                   |
| 입력칸: SearchBar와 같은 값, 높이 47                                                                                | `border-border-tertiary rounded-r3 px-padding-p8 gap-s5 h-11.75`                                           |
| 목록 테두리 `border-tertiary`, 여백 `padding-p3`(6), `radius-r3`, 그림자 0 4 12 검정 6%                             | `border p-padding-p3 rounded-r3 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.06)]`(토큰 없음)                     |
| 결과 항목 여백 10, `radius` 4, 가리킴 `surface-secondary`                                                           | `p-2.5 rounded-r2 data-highlighted:bg-surface-secondary`                                                   |
| 이름 `Body-3`(검색어 SemiBold), 업종 `Caption-1-Regular` `text-quaternary`, 주소 `Body-4-Regular` `text-quaternary` | `typography-body-3-*`, `typography-caption-1-regular`, `typography-body-4-regular text-text-quaternary`    |
| 결과 없음 위아래 20·좌우 12, 간격 `spacing-s8`, 버튼 `Label-S` 밑줄 `text-tertiary`                                 | 상자 `p-padding-p3`(6) + 안쪽 `px-1.5 py-3.5`, `gap-s8`, `typography-label-s underline text-text-tertiary` |
| 장소 칸 바탕 `surface-secondary`, 왼쪽 `padding-p8`·오른쪽 `padding-p6`·위아래 `padding-p5`, 핀 `icon-primary`      | `bg-surface-secondary pl-padding-p8 pr-padding-p6 py-padding-p5`, `FillMapPinMediumIcon text-icon-primary` |
| 「변경」 바탕 `surface-primary`, 테두리 `border-secondary`, `radius-r4`, 높이 32, 좌우 `spacing-s6`                 | `bg-surface-primary border-border-secondary rounded-r4 h-8 px-s6`                                          |

- 허용되는 dependency: `@base-ui/react`(Combobox), core `Skeleton`, 아이콘.
- Storybook state matrix: `Default`(입력·선택·변경으로 패널 전환, 「로딩」 받는 중, 「없음」 결과 없음), `Selected`, `Loading`, `Empty`, `Disabled`.

## 모션

- 패널 자리(2026-11-27 사용자 결정): 처음 나타날 때 투명도 0→1 150ms ease-out(CSS `@starting-style`), 완전히 없어질 때 1→0 100ms ease-in. 사라지는 동안은 마지막 내용을 그대로 그리되 `inert`·`aria-hidden`으로 누르거나 읽히지 않게 하고, 결과 목록은 Combobox 대신 정적 사본으로 그린다.
- 떠 있는 동안 받는 중·결과·결과 없음 사이로 바뀌면 흰 상자는 그대로 두고 안의 내용만 투명도 150ms로 나타난다. 결과 ↔ 고른 장소 칸은 상자 모양이 달라 상자는 바로 바뀌고 내용만 나타난다. 검색어마다 결과만 바뀌면 다시 나타나지 않는다.
- 처음 나타날 때는 패널 자리만 흐려지고 안쪽 내용은 따로 흐려지지 않는다(두 번 흐려지지 않게). 편집 화면처럼 처음부터 고른 장소가 있으면 고른 장소 칸도 같은 150ms로 나타난다. 사라지는 사본에는 방향키 강조가 남지 않는다.
- 높이 변화(아래 내용이 밀리는 것)는 검색마다 바뀌어 애니메이션하지 않는다. 투명도만 바뀌어 동작 줄이기에도 그대로 둔다(motion.md 「접근성」).

## 확인할 항목

- 검색 동작 (보류): 「변경」·되돌림·Esc·직접 입력 등 검색 흐름은 기능명세가 나오면 다시 맞춘다(2026-11-27 사용자). 「변경」 직후 스크린 리더 안내 문구도 그때 정한다.
- 라벨 글자 크기 (제안): Figma Default 변형만 라벨이 13px(`Body-4-SemiBold`)이고 나머지는 14px이다. 14px로 통일했다.
- 받는 중 막대 (제안): Figma 막대는 색이 3단계로 바뀌는 2초 반복 애니메이션이다. 같은 색·모서리의 core `Skeleton`(pulse)을 재사용했다.
- 목록 그림자 (확정): 토큰이 없어 Figma 값을 그대로 쓴다(2026-11-27 사용자).
- 결과·업종의 일부 간격 (제안): Figma 항목 여백 10·막대 영역 12×10 등 토큰에 없는 값은 Tailwind 크기(`p-2.5`, `px-2.5 py-3`)로 썼다.

## 검증

- [x] 사용자 관찰 동작 test(라벨·필수, 검색어 입력, 결과 선택, 받는 중 알림, 결과 없음·직접 입력, 장소 칸·변경)
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교, 방향키 선택 확인

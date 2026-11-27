# 컴포넌트: Dropdown

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #595)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Dropdown 컴포넌트` 섹션(node `8273:149293`): `Dropdown`(`7835:38435`), `Dropdown/Trigger`(`7835:38396`), `Dropdown/Option`(`7835:38375`). `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 항목 하나를 고르는 드롭다운. 크기 L(폼 입력, 높이 47px)·S(목록 필터, 33px).
- 트리거 상태: Placeholder, Filled, Open, Disabled. 항목 상태: Default, Pressed(가리킴), Selected(체크).

### 제공하지 않는 동작

- 여러 항목 선택, 검색 입력, 항목 그룹은 Figma에 없어 만들지 않았다.

## Public API

- Props: `items`(`{ value, label }[]`), `value`(`string | null`), `onValueChange`, `placeholder`, `size`(`lg` 기본 | `sm`), `disabled`, `name`, `className`(트리거), `aria-label` 또는 `aria-labelledby`(필수).
- Controlled / uncontrolled: controlled.
- 호출자 소유 책임: 항목·안내 글자 문구, 선택 값 보관, 폭.

## 상태와 동작

- Placeholder: 글자 `body-3-semibold` `text-quinary`, 화살표 `icon-quaternary`.
- Filled: 글자 `body-3-regular` `text-secondary`, 화살표 `icon-tertiary`.
- Open: 테두리 `border-strong`, 글자 `body-3-semibold` `text-secondary`, 위 화살표 `icon-secondary`.
- Disabled: 바탕 `surface-disabled`, 테두리 `border-disabled`, 흐림 40%.
- 펼침 패널: 트리거 아래 4px, 트리거 폭, 화면에 남은 높이까지(`max-h-(--available-height)`, 넘치면 스크롤). 마우스를 올린 항목·키보드로 옮긴 항목(`focus-visible`)은 흰 바탕 위 `overlay-hover`(키보드 항목은 안쪽 `outline-border-brand` 2px도). 열 때 Base UI가 선택 항목에 초점을 줘도 덮개는 칠하지 않는다(Figma Selected는 굵은 글자와 체크뿐, 2026-11-27 사용자 확인), 선택 항목은 SemiBold + 체크(`icon-primary`).
- 긴 글자: 트리거·항목 모두 한 줄 말줄임.

## 접근성

- Base UI Select: 트리거 `combobox`, 패널 `listbox`, 항목 `option`(`aria-selected`). 방향키 이동, 글자 입력으로 찾기, Esc·바깥 누르면 닫기.
- 이름: `aria-label` 또는 `aria-labelledby` 필수.
- 화살표 아이콘은 장식이다.

## Styling과 의존성

| Figma 값                                                                                                       | 토큰·클래스                                                                            |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| L 트리거 높이 47, 좌우 `padding-p8`, `radius-r5`, 간격 `spacing-s4`                                            | `h-11.75 px-padding-p8 rounded-r5 gap-s4`                                              |
| S 트리거 높이 33, 좌우 `padding-p6`, `radius-r3`                                                               | `h-8.25 px-padding-p6 rounded-r3`                                                      |
| 테두리 `border-secondary`, Open `border-strong`                                                                | `border-border-secondary data-popup-open:border-border-strong`                         |
| 화살표 L `Icon-S` 16px, S `Icon-M` 20px                                                                        | `LineChevron{Down,Up}{Small,Medium}Icon`                                               |
| L 패널 `spacing-s4`(8) 여백, `radius-r8`(16) / S 패널 `padding-p2`(4), `radius-r5`(10), 항목 간격 `spacing-s1` | `p-s4 rounded-r8` / `p-padding-p2 rounded-r5`, `gap-s1`                                |
| 항목 L 높이 41·`radius-r4`, S 높이 33·`radius-r3`, 왼쪽 `padding-p6`·오른쪽 `padding-p5`                       | `h-10.25 rounded-r4` / `h-8.25 rounded-r3`, `pl-padding-p6 pr-padding-p5`              |
| 항목 글자 `Body-3-Regular` `text-primary`, 선택 `Body-3-Semibold`                                              | `typography-body-3-regular text-text-primary data-selected:typography-body-3-semibold` |
| 패널 그림자 0 6 10 검정 7%                                                                                     | `shadow-[0px_6px_10px_0px_rgba(0,0,0,0.07)]`(토큰 없음)                                |

- 허용되는 dependency: `@base-ui/react`(Select). Base UI 타입은 공개하지 않는다.
- Storybook state matrix: `Large`(선택 전·후·비활성), `Small`, `Filter`.

## 확인할 항목

- 패널 그림자 (확정): 토큰이 없어 Figma 값을 그대로 쓴다. 그림자 토큰을 추가하면 바꾼다(2026-11-27 사용자).
- L 펼침 예시의 항목 여백 (제안): Figma `Dropdown`(Open) 예시의 첫 두 항목은 좌우 8px, `Dropdown/Option` 컴포넌트는 왼쪽 12·오른쪽 10px이다. 컴포넌트 값을 따랐다.
- 포커스 윤곽 (제안): Figma에 없어 `outline-border-brand` 2px을 더했다.

## 검증

- [x] 사용자 관찰 동작 test(안내·선택 글자, 항목 선택, aria-selected, 비활성)
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교

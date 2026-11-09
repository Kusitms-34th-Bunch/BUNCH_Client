# 컴포넌트: MenuLabel

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 확인, 실기기 미검증)
- Figma: `Menu Label`(`1873:34281`: Disabled `1873:34282`, Default `1873:34286`, Pressed `1873:34290`, 속성 `Show Left Icon`·`Show Right Icon`)

## 목적과 범위

- 글자와 오른쪽 화살표로 된 목록 한 줄. 글자 앞 아이콘(예: 휴지통)과 화살표는 켜고 끌 수 있다. 다른 화면이나 동작으로 넘어가는 항목(더보기 시트의 「차단하기」, 설정의 「프로필 편집」 등).
- 팝오버 메뉴용 `MenuItem`(`role="menuitem"`, 포커스는 `Menu`가 관리)과 다르다. 이 컴포넌트는 기본이 일반 버튼이고, `renderLink`를 주면 링크다.

## Public API

- `children`: 글자이자 접근성 이름.
- native `<button>` 속성(`onClick`, `disabled`, `className` 등). `type`은 `button`으로 고정한다.
- `leftIcon`(선택): 글자 앞 20px 장식 아이콘. Figma `Show Left Icon`은 교체 가능한 아이콘(기본 휴지통)이라 아이콘 자산은 호출자가 넘긴다(`TextButton`의 `leftIcon`과 같은 방식). 접근성 이름에서 뺀다.
- `showChevron`(선택, 기본 `true`): 오른쪽 화살표 표시. Figma `Show Right Icon`.
- `tone`(선택, 기본 `default`): `danger`면 글자와 앞 아이콘이 `system-fail-text`다. 삭제처럼 되돌릴 수 없는 항목에 쓴다(Figma 번들 댓글 더보기 `5367:121622`).
- `renderLink({ className, children })`(선택): 화면 이동 항목을 링크로 그린다. 호출자가 `className`·`children`을 링크 요소(예: Next `Link`)에 그대로 붙인다. 이때 버튼 속성은 쓰지 않는다. 하단 탭(`BottomNavigation`)의 `renderItem`과 같은 방식이다.

## 상태와 동작

- 누르는 동안 `overlay-hover`(10%)를 75ms ease-out으로 덮는다(Figma Pressed, 2026-11-01 갱신 전에는 `overlay-pressed` 20%였다). 동작 줄이기에서는 전환을 끈다.
- 비활성(`disabled`, Figma Disabled): 전체 `opacity-disabled`(40%), 글자 `text-disabled`, 아이콘 `icon-disabled`. 눌림 효과와 클릭이 없다. `renderLink`(링크)에는 비활성이 없다.
- 긴 글자는 단어 단위로 줄바꿈하고 화살표는 줄어들지 않는다.

## 접근성

- 버튼·링크 이름은 글자뿐이다(앞 아이콘 제외). 링크 모드는 호출자가 넘긴 링크 요소의 역할을 따른다. 화살표 아이콘은 `aria-hidden`.
- 키보드 초점은 `outline-border-brand` 2px로 표시한다.
- 비활성(`disabled`)은 초점을 받지 않고 이유를 알리지 않는다. 이유 안내가 필요한 화면은 호출자가 근처에 설명을 둔다.
- `renderLink`와 `disabled`는 타입에서 함께 쓸 수 없다(링크에는 비활성이 없다).

## Styling과 의존성

| Figma                                                          | 구현                                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 패딩 좌우 `spacing-s2`(4)·위아래 `padding-p5`(10), radius `r4` | `px-s2 py-padding-p5 rounded-r4`                                                                           |
| Body-2-Medium(15/22), `text-secondary`                         | `typography-body-2-medium text-text-secondary`                                                             |
| `Line/Icon-M/chevron-right` 20                                 | `LineChevronRightMediumIcon`, `text-icon-quaternary`                                                       |
| Pressed `overlay-hover`                                        | `before:bg-overlay-hover`                                                                                  |
| 앞 아이콘과 글자 사이 `spacing-s2`(4)                          | `gap-s2`                                                                                                   |
| Disabled `opacity-disabled`·`text-disabled`·`icon-disabled`    | `disabled:opacity-(--semantic-opacity-disabled)`, `group-disabled:text-text-disabled`·`text-icon-disabled` |

## 확인할 항목

- `danger` 글자(`system-fail-text` #f04d29, 15px 중간 굵기)는 흰 바탕에서 약 3.6:1로 AA 4.5:1에 못 미친다(계산값). Figma 지정 색이라 그대로 두었고, 휴지통 아이콘이 함께 있어 색만으로 뜻을 전하지는 않는다. `TextButton` warning(약 3.7:1)과 함께 어두운 빨강 토큰을 디자인에 요청할 대상

- 디자인 변경 (반영, 2026-11-03 확인): 좌우 패딩 10→4, 글자 Body-1-Medium→Body-2-Medium, 높이 44→42. Bottom Sheet 06(`2487:46356`)은 새 값을 쓰고, 번치 더보기 화면(`1873:34575`)은 아직 다른 컴포넌트 `Label - Status`(좌우 16+10, 16/24)다.
- 화살표 색: Figma 변수 `icon-quaternary`(#bcbec2)와 같다(2026-11-01 확인).
- 앞 아이콘 색 (제안): 이 컴포넌트의 Figma 변수에 아이콘 색이 `icon-quaternary`·`icon-disabled`만 있어 화살표와 같은 `icon-quaternary`를 썼다. 기본 컴포넌트는 앞 아이콘이 꺼져 있어 켠 상태의 색을 화면으로 확인하지 못했다. Bottom Sheet 09(`3740:78862`)의 인스턴스는 앞 아이콘이 #25282D(`icon-secondary`)라 `PinnedPlaceSheet`는 아이콘에 색을 따로 준다. 기본값을 바꿀지 디자이너 확인 필요. 아이콘에 직접 준 색은 비활성(`group-disabled`)의 `icon-disabled`보다 우선하므로, 비활성 항목에서는 이 방식으로 덮지 않는다.

## 검증

- [x] test 6개: 버튼 이름·아이콘 숨김, 클릭, `renderLink` 링크, 링크와 비활성 동시 사용 불가(타입), 앞 아이콘·화살표 끄기, 비활성
- [x] Story: Default, LongText, WithLeftIcon, WithoutChevron, Disabled

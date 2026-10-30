# 컴포넌트: MenuLabel

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 확인, 실기기 미검증)
- Figma: `Menu Label`(Default `1873:34286`, Pressed `1873:34290`)

## 목적과 범위

- 글자와 오른쪽 화살표로 된 목록 한 줄. 다른 화면이나 동작으로 넘어가는 항목(더보기 시트의 「차단하기」, 설정의 「프로필 편집」 등).
- 팝오버 메뉴용 `MenuItem`(`role="menuitem"`, 포커스는 `Menu`가 관리)과 다르다. 이 컴포넌트는 일반 버튼이다.

## Public API

- `children`: 글자이자 접근성 이름.
- native `<button>` 속성(`onClick`, `className` 등). `type`은 `button`으로 고정한다.

## 상태와 동작

- 누르는 동안 `overlay-pressed`(20%)를 75ms ease-out으로 덮는다(Figma Pressed). 동작 줄이기에서는 전환을 끈다.
- 긴 글자는 단어 단위로 줄바꿈하고 화살표는 줄어들지 않는다.

## 접근성

- 버튼 이름은 글자뿐이다. 화살표 아이콘은 `aria-hidden`.
- 키보드 초점은 `outline-border-brand` 2px로 표시한다.

## Styling과 의존성

| Figma                              | 구현                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| 패딩 `padding-p5`(10), radius `r4` | `p-padding-p5 rounded-r4`                            |
| Body-1-Medium, `text-secondary`    | `typography-body-1-medium text-text-secondary`       |
| `Line/Icon-M/chevron-right` 20     | `LineChevronRightMediumIcon`, `text-icon-quaternary` |
| Pressed `overlay-pressed`          | `before:bg-overlay-pressed`                          |

## 확인할 항목

- 화살표 색 (제안): Figma 인스턴스에 색 값이 없어 `UploadOptionCard`의 같은 화살표처럼 `icon-quaternary`를 썼다.

## 검증

- [x] test 2개: 버튼 이름·아이콘 숨김, 클릭
- [x] Story: Default, LongText

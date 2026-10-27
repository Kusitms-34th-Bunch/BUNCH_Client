# 컴포넌트: Menu, MenuItem, MenuDivider

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다. `Menu`(`web/menu`)와 `MenuItem`(`web/menuItem`)·`MenuDivider`(`web/menuDivider`)가 한 묶음이다.
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Menu Item`(node `1422:23422`), `Menu`(node `1431:23489`), 구분선 위치 시안(node `1782:30152`). 이슈 #96.

## 목적과 범위

### 제공하는 동작

- `Menu`: 폭 172px 흰색 카드(radius 16, 안쪽 여백 8, 항목 간격 4, 그림자 `0 6px 8.5px rgba(0,0,0,0.2)`). 항목 묶음을 나누고 싶은 위치에 `MenuDivider`(0.4px `border-secondary`, 위아래 간격은 항목 간격 4px)를 자식으로 넣는다. Figma 시안은 "삭제" 앞에만 선이 있다.
- `MenuItem`: 높이 44px 이상 행(좌우 16, 상하 10, radius 12). Default / Warning 두 톤과 선택적 Medium(20px) 아이콘. 누르는 동안 `overlay-hover`(10%) 오버레이.

### 제공하지 않는 동작

- 메뉴를 열고 닫는 버튼, 위치 계산, 바깥 클릭·Esc 닫기, 열릴 때 첫 항목 포커스는 호출하는 쪽(feature)이 맡는다.
- Figma에 없는 비활성·호버 상태는 만들지 않는다.

## Public API

- `Menu`: `aria-label`(필수), 그리고 `div` 속성(`role`은 고정).
- `MenuItem`: `children`(필수, 접근성 이름), `tone`(`default` | `warning`), `icon`(장식 아이콘, 호출하는 쪽이 `aria-hidden` 전달), 그리고 `button` 속성(`disabled`·`type`·`role`은 받지 않음).
- 호출자 소유 책임: 항목 문구와 동작, 열림 상태, 포커스 복귀.

## 상태와 동작

| Figma 상태 | 코드                                                   |
| ---------- | ------------------------------------------------------ |
| Default    | 글자·아이콘 `text-secondary`(#25282D)                  |
| Warning    | 글자·아이콘 `system-fail-text`(#F04D29)                |
| Pressed    | `:active` 동안 `overlay-hover` 오버레이(75ms ease-out) |

## 접근성

- `Menu`는 `role="menu"`, `MenuItem`은 `<button role="menuitem">`이고 `tabIndex=-1`이다. 방향키 위·아래(순환)·Home·End로 항목 포커스를 옮긴다.
- 구분선(`MenuDivider`)은 `role="separator"`이고 방향키 이동은 `menuitem`만 대상이라 건너뛴다. 아이콘 래퍼는 `aria-hidden`이라 호출자가 이름 있는 아이콘을 넘겨도 항목 이름에 섞이지 않는다.
- 열 때 메뉴(`ref.focus()`) 또는 첫 항목에 포커스를 주고, 닫을 때 트리거로 돌리는 일은 호출하는 쪽이 한다. 메뉴와 항목은 `tabIndex=-1`이라 Tab으로 들어올 수 없다. Esc·바깥 클릭·Tab 이탈 닫기와 트리거의 `aria-haspopup="menu"`·`aria-expanded`도 호출하는 쪽 책임이다.
- Warning 글자 대비는 흰 배경 기준 약 3.6:1로 AA(4.5:1)에 못 미친다. 디자이너 확인 필요.

## Styling과 의존성

- Token: `rounded-r8`·`rounded-r6`, `p-s4`·`gap-s2`·`gap-s4`·`px-s8`·`py-s5`, `bg-surface-primary`, `bg-border-secondary`, `bg-overlay-hover`, `text-text-secondary`, `text-system-fail-text`, `typography-login-button`(15/22) + `font-(--semantic-font-weights-pretendard-1)`(600). 15/22 SemiBold typography token이 없어 LoginButton과 같은 조합을 쓴다.
- 아이콘: `LineDownloadMediumIcon`, `LineTrashcanMediumIcon`(이 이슈에서 S·M·L 추가). dependency 추가 없음.
- Storybook: `Web/Menu`(Default, WithDivider, WithIcons, Matrix), `Web/MenuDivider`(Default), `Web/MenuItem`(Default, Warning, WithIcon, WarningWithIcon).

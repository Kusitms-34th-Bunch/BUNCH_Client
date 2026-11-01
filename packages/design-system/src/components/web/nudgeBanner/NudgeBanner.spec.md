# 컴포넌트: NudgeBanner

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Label`(`2452:42097`: Disabled `2452:42091`, Default `2452:42098`, Pressed `2452:42102`)
- 이슈: #154

## 목적과 범위

- 다음 행동을 권하는 회색 배너(예: 「작성 중인 번들을 완성해 보세요!」). 오른쪽 화살표로 다른 화면으로 넘어간다는 것을 보여 준다.
- `MenuLabel`과 비슷하지만 바탕(`surface-secondary`), 글자(Label-S `text-tertiary`), 패딩, 비활성 상태가 달라 따로 만든다.
- 누를 때의 이동과 문구는 호출자가 정한다.

## Public API

- `children`: 안내 글자(필수, 접근성 이름).
- `button`의 나머지 속성(`onClick`, `disabled`, `className`, `aria-*` 등). `type`은 `button` 고정.

## 상태와 동작

- 기본: 바탕 `surface-secondary`, 글자 `text-tertiary`.
- 눌림: 바탕 위에 `overlay-pressed`(20%)를 겹친다. Figma 눌림 글자는 변수 없는 검정이지만, 다른 컴포넌트처럼 글자색은 유지한다.
- 비활성(`disabled`): `opacity-disabled`(40%)와 글자 `text-disabled`(Figma 그대로 둘 다 적용), 누를 수 없다.
- 긴 글자는 단어 단위로 줄바꿈하고 화살표는 줄어들지 않는다.

## 접근성

- 일반 `button`이고 접근성 이름은 안내 글자다. 화살표는 장식이다.
- 비활성은 native `disabled`라 초점을 받지 않는다(안내 배너라 비활성일 때 읽을 정보가 없음).
- 초점 표시는 `outline-border-brand` 2px.

## Styling과 의존성

| Figma                                                 | 구현                                                    |
| ----------------------------------------------------- | ------------------------------------------------------- |
| 343×48, 좌우 16·위아래 14, radius `r4`                | `px-padding-p8 py-padding-p7 rounded-r4`, 폭은 `w-full` |
| 바탕 `surface-secondary`                              | `bg-surface-secondary`                                  |
| 글자 Label-S, `text-tertiary`(비활성 `text-disabled`) | `typography-label-s text-text-tertiary`                 |
| 화살표 `Line/Icon-M/chevron-right` 20, #BCBEC2        | `LineChevronRightMediumIcon` + `text-icon-quaternary`   |
| 비활성 `opacity-disabled`(40)                         | `opacity-(--semantic-opacity-disabled)`                 |
| 눌림 검정 overlay                                     | `overlay-pressed` 바탕 layer                            |

## 확인할 항목

- 이름: Figma 이름이 `Label`이라 기존 `web/label`과 겹쳐 `NudgeBanner`로 지었다.
- 눌림 글자색: Figma는 변수 없는 검정이다. 다른 컴포넌트와 맞춰 `text-tertiary`를 유지했다.
- 비활성 글자 대비: 40% 흐림과 `text-disabled`가 겹쳐 아주 옅다(Figma 그대로, 비활성이라 대비 기준 예외).

## 검증

- [x] test: 접근성 이름·화살표 장식, 클릭, 비활성
- [x] Story: Default, Disabled, LongText
- [x] Storybook Chromium 치수·색 대조(343×48, 패딩 14·16, radius 8, 글자 13/20 600, 화살표 20 #BCBEC2)
- [ ] 스크린 리더·실기기

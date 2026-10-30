# 컴포넌트: ProfileRadioCard

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Profile Radio Card`(`1659:15379`: Disabled `1659:15378`, Default `1659:15505`, Pressed `1659:15525`, Selected `1659:15536`)
- 이슈: #140

## 목적과 범위

- 멤버 중 한 명을 고르는 카드(예: 관리자 지정): 40px 프로필 이미지, 이름, 오른쪽 라디오.
- 같은 `name`의 카드 중 하나를 고르는 네이티브 라디오다. 그룹(`fieldset`·`legend`)과 선택 값은 호출자가 맡는다.

## Public API

- `label`: 멤버 이름(필수, 라디오 접근성 이름). 네이티브 `name`은 라디오 그룹 이름으로 쓰므로 멤버 이름은 `label`로 받는다.
- `imageSrc?`: 프로필 이미지 주소(없으면 기본 배경색 원). 이미지는 장식이다.
- native `<input type="radio">` 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange`, `disabled` 등). `className`은 카드(`<label>`)에 적용한다.

## 상태와 동작

- Default: 바탕 `surface-secondary`, 라디오 빈 원.
- Pressed(누르는 동안): 카드 바탕과 프로필 이미지에 `overlay-pressed`(20%)를 겹치고, 라디오는 회색 링·점(`core/radio`의 눌림, 카드 어디를 눌러도 적용)이다. 이름 글자는 어두워지지 않는다.
- Selected: 바탕 `surface-brand-subtle-1`, 안쪽 1px `border-brand-subtle` 링, 프로필 이미지 테두리 `border-brand-subtle`, 라디오 브랜드색 점.
- Disabled: 카드 40% 흐림, 이름 `text-disabled`, 누를 수 없음.
- 긴 이름은 한 줄에서 말줄임하고 `title`로 전체를 보여 준다. 터치·키보드 사용자는 툴팁을 볼 수 없어서, 동명이인이나 긴 이름을 구분할 방법은 호출 화면이 정한다(스크린 리더는 전체 이름을 읽음).

## 접근성

- 카드 전체가 `<label>`이라 어디를 눌러도 선택된다. 라디오의 접근성 이름은 멤버 이름이다.
- 키보드: 같은 그룹 안에서 방향키로 이동·선택(네이티브 라디오).
- 초점 표시는 라디오 원에 `outline`(`core/radio`).
- 선택 상태는 색만이 아니라 라디오 점으로도 보인다.

## Styling과 의존성

| Figma                                                                | 구현                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 패딩 12·10, radius `r5`, 바탕 `surface-secondary`, 높이 60           | `px-padding-p6 py-padding-p5 rounded-r5 bg-surface-secondary`         |
| 이미지·이름 간격 8                                                   | `gap-s4`                                                              |
| 이미지 40, 테두리 `border-tertiary`(선택 시 `border-brand-subtle`)   | `ProfileImage` + `size-10 border`                                     |
| 이름 Body-1-Medium, `text-primary`(비활성 `text-disabled`)           | `typography-body-1-medium`                                            |
| Control Radio 20                                                     | `Radio`(`core/radio`)                                                 |
| 선택 바탕 `surface-brand-subtle-1`, 테두리 1px `border-brand-subtle` | `has-checked:bg-surface-brand-subtle-1 has-checked:ring-1 ring-inset` |
| 눌림 `overlay-pressed`(20%)                                          | 바탕 겹침 layer(글자는 그대로)                                        |
| 흐림 `opacity-disabled`(40)                                          | `opacity-(--semantic-opacity-disabled)`                               |

## 확인할 항목

- 선택 테두리 (제안): Figma는 1px `border`라 선택될 때 크기가 1px 변한다. 기존 `RadioCard`처럼 안쪽 `ring`으로 그려 크기를 고정했다.
- Pressed의 이미지 테두리 (제안): Figma Pressed 이미지 테두리가 검정이지만 겹침 효과의 결과로 보고 따로 그리지 않았다.
- 초점 표시 (확인): 키보드 초점 테두리는 20px 라디오 원에만 그려진다(`core/radio`). `VisibilityOption`처럼 카드 전체에 그릴지는 Figma 초점 표현을 확인한 뒤 정한다.

## 검증

- [x] test: 이름이 접근성 이름, 카드 클릭으로 선택, 그룹 안 하나만 선택, 비활성, 긴 이름 `title`
- [x] Story: Default, Selected, Disabled, Group(3명), LongName
- [x] Storybook Chromium 치수 대조
- [ ] 스크린 리더·실기기

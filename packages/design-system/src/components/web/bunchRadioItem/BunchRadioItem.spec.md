# 컴포넌트: BunchRadioItem

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Profile - Label`(`1873:31868`: Disabled `1873:31869`, Default `1873:31880`, Pressed `1873:31891`)
- 이슈: #158

## 목적과 범위

- 여러 번치 중 하나를 고르는 행: 40px 대표 이미지, 번치 이름, 「알림 N개」 칩, 선택되면 오른쪽 체크.
- Figma `Pressed`(회색 바탕 + 체크)를 **선택됨**으로 사용한다(사용자 결정). 누르는 동안에도 같은 회색 바탕을 보인다.
- 번치 목록 한 줄(`BunchListItem`, Figma `Label`)은 누르는 버튼이고, 이 컴포넌트는 고르는 라디오라 따로 만든다.
- 그룹(`name`, `fieldset`·`legend`)과 선택 값은 호출자가 정한다.

## Public API

- `label`: 번치 이름(필수, 라디오 접근성 이름, 길면 한 줄 말줄임).
- `imageSrc?`: 대표 이미지 주소(없으면 기본 배경색 원). 이미지는 장식이다.
- `alertCount?`: 「알림 N개」 칩. 0 이하이거나 없으면 숨긴다.
- native `radio` input 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange`, `disabled` 등). `className`은 행(`label`)에 적용한다.

## 상태와 동작

- 기본: 바탕 없음.
- 누르는 중: 바탕 `overlay-hover`(10%).
- 선택됨: 바탕 `overlay-hover`(10%), 이미지 위 `overlay-pressed`(20%), 칩 위 `overlay-hover`, 오른쪽 체크(`FillCircleCheckLargeIcon` 24, `icon-quaternary`).
- 비활성: 흐림(`opacity-disabled` 40%)과 이름 `text-disabled`(Figma 그대로).
- 긴 이름은 말줄임하고 `title`로 전체를 보여 준다. 칩과 체크는 줄어들지 않는다.

## 접근성

- 실제 `input type="radio"`(시각적으로 숨김)를 `label`이 감싸서, 행 어디를 눌러도 선택되고 방향키로 그룹 안을 이동한다.
- 접근성 이름은 「번치 이름, 알림 N개」다(쉼표는 숨은 글자).
- 선택 여부는 라디오 `checked`로 전달되고 체크 아이콘은 장식이다.
- 초점 표시는 행 바깥 `outline-border-brand` 2px(`has-focus-visible`).

## Styling과 의존성

| Figma                                                                                       | 구현                                                                                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 343×52, 좌우 10·위아래 6, radius `r4`                                                       | `px-padding-p5 py-padding-p3 rounded-r4`, 폭은 `w-full`                                                      |
| 이미지 40, 테두리 `border-tertiary`, 이미지·글자 간격 10                                    | `ProfileImage size="S"` + `border border-border-tertiary`, `gap-s5`                                          |
| 이름 Body-1-Medium `text-primary`                                                           | `typography-body-1-medium text-text-primary`                                                                 |
| 이름·칩 간격 6                                                                              | `gap-s3`                                                                                                     |
| 알림 칩 `chip-pink-bg`·`chip-pink-fg`, 좌우 4·위아래 2, radius `r2`, Caption-1(숫자 Medium) | `ColorBadge` pink `md` + `px-padding-p2 py-padding-p1 rounded-r2 gap-s1`, 숫자 `typography-caption-1-medium` |
| 체크 `Fill/Icon-L/circle-check` 24, #BCBEC2                                                 | `FillCircleCheckLargeIcon` + `text-icon-quaternary`                                                          |
| Pressed 바탕 `overlay-hover`, 이미지 `overlay-pressed`                                      | `has-checked`·`active` 바탕, 이미지 `after:bg-overlay-pressed`                                               |

## 확인할 항목

- 체크 의미: Figma 이름은 `Pressed`지만 체크가 함께 있어 선택됨으로 사용했다. 디자이너에게 선택 상태 이름을 확인한다.
- 칩 문구 「알림 N개」는 고정이다. 다른 문구가 필요하면 prop을 추가한다.
- 칩 숫자 상한(예: 99+)은 Figma에 없다.
- 체크 아이콘(`icon-quaternary` #BCBEC2)은 선택 표시라 비텍스트 대비 3:1 대상일 수 있다(Figma 값). 디자이너 확인이 필요하다.
- 비활성은 흐림과 `text-disabled`가 겹친다(Figma 그대로, 비활성이라 대비 기준 예외).

## 검증

- [x] test: 접근성 이름(이름·알림 수), 알림 0 숨김, 그룹 안 하나만 선택, 비활성, 체크 장식·title
- [x] Story: Default, Checked, Disabled, WithoutAlert, Group(fieldset·legend)
- [x] Storybook Chromium 치수·색 대조(행 343×52, 패딩 6·10, 이미지 40, 이름 x60, 칩 패딩 2·4·radius 4(`r2`), 체크 24 #BCBEC2)
- [ ] 스크린 리더·실기기

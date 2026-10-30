# 컴포넌트: DescriptionRadioCard

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Radio Card - Description`(`2198:44570`: Disabled `2198:44571`, Default `2198:44578`, Pressed `2198:44592`, Selected `2198:44585`)
- 이슈: #140

## 목적과 범위

- 제목과 설명이 있는 선택 카드(예: 공개 범위 「공개 / 누구나 우리 번치와 번들을 볼 수 있어요.」). 라디오는 왼쪽이다.
- 기존 컴포넌트와 대조한 결과 따로 만들었다.
  - `RadioCard`(Figma `Radio Card` `1379:22093`): 글자 한 줄, 높이 54, radius 8, 비활성 없음.
  - `VisibilityOption`(`633:2410`): 아이콘 원이 있고 라디오가 보이지 않는다.
- 그룹(`fieldset`·`legend`)과 선택 값은 호출자가 맡는다.

## Public API

- `title`: 제목(필수, 접근성 이름). `description?`: 설명(접근성 설명, 없으면 제목만).
- native `<input type="radio">` 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange`, `disabled` 등). `className`은 카드에 적용한다.
- `id`를 넘기면 제목·설명 요소 id(`<id>-title`, `<id>-description`)가 파생되니 문서 안에서 고유해야 한다.

## 상태와 동작

- Default: 바탕 `surface-secondary`.
- Pressed: 바탕에 `overlay-pressed`(20%), 라디오 회색 링·점(카드 어디를 눌러도 적용). 글자는 그대로.
- Selected: 바탕 `surface-brand-subtle-1`, 안쪽 1px `border-brand-subtle` 링, 라디오 브랜드색 점.
- Disabled: 카드 40% 흐림, 제목·설명 `text-disabled`, 누를 수 없음.
- 긴 제목·설명은 줄바꿈한다(`break-keep`, 공백 없는 긴 영문·URL은 `wrap-break-word`로 끊음).

## 접근성

- 라디오 이름은 제목(`aria-labelledby`), 설명은 `aria-describedby`로 따로 읽힌다(`VisibilityOption`과 같은 방식).
- 카드 전체가 `<label>`이라 어디를 눌러도 선택된다. 키보드는 네이티브 라디오와 같다.

## Styling과 의존성

| Figma                                                   | 구현                                              |
| ------------------------------------------------------- | ------------------------------------------------- |
| 패딩 12, radius `r5`, 바탕 `surface-secondary`, 높이 63 | `p-padding-p6 rounded-r5 bg-surface-secondary`    |
| 라디오·글자 간격 10                                     | `gap-s5`                                          |
| 제목·설명 간격 2                                        | `gap-s1`                                          |
| 제목 Body-3-Semibold, `text-primary`                    | `typography-body-3-semi-bold text-text-primary`   |
| 설명 Caption-1-Regular, `text-tertiary`                 | `typography-caption-1-regular text-text-tertiary` |
| Control Radio 20                                        | `Radio`(`core/radio`)                             |
| 선택·눌림·흐림                                          | `ProfileRadioCard`와 같음                         |

## 확인할 항목

- 선택 테두리 (제안): `ProfileRadioCard`와 같은 이유로 안쪽 `ring`을 썼다.
- 이름 (제안): Figma `Radio Card - Description`을 기존 `RadioCard`와 구분해 `DescriptionRadioCard`로 지었다.
- 초점 표시 (확인): 키보드 초점 테두리는 20px 라디오 원에만 그려진다(`core/radio`). `VisibilityOption`처럼 카드 전체에 그릴지는 Figma 초점 표현을 확인한 뒤 정한다.

## 검증

- [x] test: 제목이 이름·설명이 설명, 카드 클릭으로 선택, 비활성, 설명 생략
- [x] Story: Default, Selected, Disabled, Group, NoDescription, LongText
- [x] Storybook Chromium 치수 대조
- [ ] 스크린 리더·실기기

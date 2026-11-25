# 컴포넌트: DescriptionRadioCard

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(2026-11-24 크기·색 변경 뒤 Storybook·앱 캡처로 확인, 픽셀 치수 재측정·실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Radio Card - Description`(`2198:44570`: Disabled `2198:44571`, Default `2198:44578`, Pressed `2198:44592`, Selected `2198:44585`)
- 이슈: #140, 2026-11-24 색상 변경 #570(「11/24(화) 색상변경 관련 UI」 번치 프로필 편집 `7916:106344`)

## 목적과 범위

- 제목과 설명이 있는 선택 카드(예: 공개 범위 「공개 / 누구나 우리 번치와 번들을 볼 수 있어요.」). 라디오는 왼쪽이다.
- 기존 컴포넌트와 대조한 결과 따로 만들었다.
  - `RadioCard`(Figma `Radio Card` `1379:22093`): 제목·설명 필수, 높이 78, radius 8(`r4`), 회색 바탕, 선택 `border-strong` 테두리, 비활성 없음. 온보딩·번들 공개 범위가 쓴다.
  - 아이콘 원이 있고 라디오가 보이지 않는 카드(Figma `633:2410`, 구현은 #290에서 삭제).
- 그룹(`fieldset`·`legend`)과 선택 값은 호출자가 맡는다.

## Public API

- `title`: 제목(필수, 접근성 이름). `description?`: 설명(접근성 설명, 없으면 제목만).
- native `<input type="radio">` 속성(`name`, `value`, `checked`, `defaultChecked`, `onChange`, `disabled` 등). `className`은 카드에 적용한다.
- `id`를 넘기면 제목·설명 요소 id(`<id>-title`, `<id>-description`)가 파생되니 문서 안에서 고유해야 한다.

## 상태와 동작

- Default: 바탕 `surface-secondary`(`#F5F5F5`), 안쪽 1px `border-secondary`(`#E1E2E5`) 링. 바탕은 컴포넌트 원본(`2198:44570`, `surface-primary`) 대신 번치 프로필 편집 화면 인스턴스(`7916:106324`)의 `surface-secondary`를 따른다(2026-11-25 사용자 결정).
- Pressed: 바탕에 `overlay-hover`(10%, 2026-11-24 이전 `overlay-pressed` 20%), 라디오 회색 링·점(카드 어디를 눌러도 적용). 글자는 그대로.
- Selected: 바탕은 그대로 `surface-secondary`, 안쪽 1px `border-strong-lighter`(`#969AA0`) 링(2026-11-24 색상 변경으로 `surface-brand-subtle-1`·`border-brand-subtle`에서 변경), 라디오는 `core/radio`의 Selected(2026-11-24부터 `icon-tertiary` 회색 점).
- Disabled: 바탕 `surface-secondary`(기본과 같음), 테두리 없음, 카드 40% 흐림, 제목·설명 `text-disabled`, 누를 수 없음.
- 전환(화면설계서 `2145:39607` 5번): 눌림은 While Pressing / Dissolve / Ease out / 75ms, 선택은 On Click / Dissolve / Ease out / 75ms. 눌림 layer의 투명도와 선택 링(`box-shadow`)을 75ms ease-out으로 바꾼다. 동작 줄이기에서는 즉시 바뀐다.
- 긴 제목·설명은 줄바꿈한다(`break-keep`, 공백 없는 긴 영문·URL은 `wrap-break-word`로 끊음).

## 접근성

- 라디오 이름은 제목(`aria-labelledby`), 설명은 `aria-describedby`로 따로 읽힌다(제목·설명 id를 `aria-labelledby`·`aria-describedby`로 잇는 방식).
- 카드 전체가 `<label>`이라 어디를 눌러도 선택된다. 키보드는 네이티브 라디오와 같다.

## Styling과 의존성

| Figma                                                                                                                                                         | 구현                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 패딩 12, radius `r5`(10), 바탕 `surface-secondary`, 테두리 1px `border-secondary`, 높이 63(2026-11-24 시안 크기·색으로 변경, 바탕은 11-25 화면 인스턴스 기준) | `p-padding-p6 rounded-r5 bg-surface-secondary ring-1 ring-inset ring-border-secondary`                             |
| 라디오·글자 간격 10                                                                                                                                           | `gap-s5`                                                                                                           |
| 제목·설명 간격 2                                                                                                                                              | `gap-s1`                                                                                                           |
| 제목 Body-3-Semibold(14/21), `text-primary`(2026-11-24 색상·글자 변경)                                                                                        | `typography-body-3-semibold text-text-primary`                                                                     |
| 설명 Caption-1-Regular, `text-tertiary`                                                                                                                       | `typography-caption-1-regular text-text-tertiary`                                                                  |
| Control Radio 20                                                                                                                                              | `Radio`(`core/radio`)                                                                                              |
| 선택·눌림·흐림                                                                                                                                                | 눌림 `overlay-hover`, 흐림은 40%·테두리 없음. 선택은 링 색만 `border-strong-lighter`(`SuggestedBundleCard`와 같음) |

## 확인할 항목

- 선택 테두리 (제안): 선택 전후 크기가 움직이지 않게 안쪽 `ring`을 썼다.
- 선택 테두리 대비 (확정, 2026-11-24): `#969AA0`은 카드 바탕(`#F5F5F5`) 위 약 2.6:1로 비텍스트 3:1에 못 미친다. 선택은 라디오 점과 native `checked`로도 전달되고, 같은 테두리를 쓰는 추천 번들 카드처럼 시안 그대로 둔다.
- 이름 (제안): Figma `Radio Card - Description`을 기존 `RadioCard`와 구분해 `DescriptionRadioCard`로 지었다.
- 초점 표시 (확인): 키보드 초점 테두리는 20px 라디오 원에만 그려진다(`core/radio`). 카드 전체에 그릴지는 Figma 초점 표현을 확인한 뒤 정한다.
- 크기·글자·색 (반영, 2026-11-24): 「색상 수정된 컴포넌트」 시안의 `Radio Card - Description`(패딩 12·radius 10·제목 Body-3-Semibold·간격 10/2·높이 63, `border-secondary` 테두리)에 맞췄다. 바탕은 2026-11-25 사용자 결정으로 화면 인스턴스의 `surface-secondary`. 이전 구현은 온보딩 `Radio Card`와 같은 여백 16/18·`r4`·Body-2-Medium(15)·간격 14/4·회색 바탕이었다.

## 검증

- [x] test: 제목이 이름·설명이 설명, 카드 클릭으로 선택, 비활성, 설명 생략
- [x] Story: Default, Selected, Disabled, Group, NoDescription, LongText
- [x] Storybook Chromium 치수 대조(2026-11-24 크기 변경 전 기준, 변경 뒤 미측정)
- [ ] 스크린 리더·실기기

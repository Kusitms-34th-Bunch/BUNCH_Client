# 컴포넌트: MenuTabs

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Menu_Tap`(`2500:49388`: Selected `2500:49387`, Default `2500:49386`), 아이콘 탭 `Menu Tap`(`3035:55863`: Disabled·Default·Pressed·Selected)
- 이슈: #144, 아이콘 탭 #158

## 목적과 범위

- 「팔로워 120 | 팔로잉 120」처럼 이름과 숫자가 있는 탭. 선택된 탭 아래에 2px 선이 있다.
- Base UI `Tabs`를 감싼 Compound 부품(`Root`·`List`·`Tab`·`Panel`)이다. 탭 역할, 방향키 이동, 패널 연결은 Base UI가 맡는다.
- Figma 이름 `Menu_Tap`은 `Tab`의 오타로 보고 `MenuTabs`로 지었다.
- 아이콘만 있는 탭(Figma `Menu Tap`, 예: 사진·번들 보기 전환)은 같은 `Root`·`List`·`Panel`에 `IconTab`을 넣어 쓴다.

## Public API

- `MenuTabs.Root`: `value`, `defaultValue`, `onValueChange(value)`. Base UI 타입은 노출하지 않고 필요한 속성만 공개한다(ADR 009·014와 같은 원칙).
- `MenuTabs.List`: 탭 묶음(`tablist`). 접근성 이름 `aria-label` 또는 `aria-labelledby`가 타입상 필수다(예: `팔로우 목록`). `variant?`(`text`·`icon`, 기본 `text`)로 선택 밑줄 모양을 고른다. `IconTab`을 쓰면 `icon`.
- `MenuTabs.Tab`: `value`(필수), `label`(필수), `count?`(숫자 또는 글자), `disabled?`. 접근성 이름은 「이름 숫자」다.
- `MenuTabs.IconTab`: `value`(필수), `label`(필수, 아이콘만 보이므로 접근성 이름), `icon`(선택 전 Line 아이콘), `selectedIcon`(선택된 Fill 아이콘), `disabled?`.
- `MenuTabs.Panel`: `value`(필수), `keepMounted?`. 선택된 탭의 내용.
- 각 부품은 `className`(문자열)을 받는다.

## 상태와 동작

- 기본: 글자 `text-tertiary`.
- 선택: 글자 `text-primary`, 아래 2px 선 `chip-gray-fg`.
- 탭 폭은 글자에 맞춘다(Figma 120px은 「팔로워 120」 + 좌우 22에 맞는 값).
- 아이콘 탭: 36×40(아이콘 20, 좌우 8·위아래 10). 기본은 Line 아이콘 `icon-quaternary`와 1px 밑줄 `border-tertiary`, 선택은 Fill 아이콘 `icon-tertiary`와 밑줄 `icon-tertiary`, 누르는 동안 `overlay-hover`, 비활성은 흐림(40%)과 밑줄 `border-disabled`. 밑줄은 Figma처럼 높이 안쪽에 그린다. 탭을 바꾸면 아이콘(겹쳐 둔 Line·Fill의 투명도)·색은 Dissolve / Ease out / 75ms로 바뀐다(화면설계서 `1892:37781` 3번). 동작 줄이기에서는 즉시 바뀐다.
- 선택 밑줄은 탭마다 그리지 않고 `List` 안의 Base UI `Tabs.Indicator` 하나가 선택된 탭 위치·폭(`--active-tab-left`·`--active-tab-width`)으로 250ms ease-out에 걸쳐 미끄러진다(2026-11-02 사용자 결정, 이동 거리가 길어 200ms에서 늘림. 화면설계서의 밑줄 Dissolve와 달라 디자이너 확인 필요). `List`의 `variant`로 모양을 고른다: `text`(기본, 2px `chip-gray-fg`), `icon`(1px `icon-tertiary`, 탭마다 있는 회색 1px 선 위). 동작 줄이기에서는 바로 옮긴다. 첫 화면에서 밑줄이 늦게 나타나지 않도록 `renderBeforeHydration`(서버 HTML의 인라인 스크립트)을 켠다. CSP를 도입하면 이 스크립트를 허용해야 한다. 강제 색상(고대비) 모드에서는 밑줄을 `CanvasText`로 그린다. 선택된 탭을 비활성으로 만들면 밑줄은 흐려지지 않는다(지금 사용처 없음).
- 키보드: 좌우 방향키로 초점 이동(끝에서 처음으로 돌아감), Enter·Space로 선택(Base UI 기본 `activateOnFocus: false`). 탭을 바꿀 때 목록을 불러오는 화면이라 방향키만으로 선택하지 않는다. 호출자가 `MenuTabs.List`에 `activateOnFocus`를 넘겨 바꿀 수 있다.

## 접근성

- `tablist`·`tab`·`tabpanel` 역할과 `aria-selected`·`aria-controls`를 Base UI가 붙인다.
- 선택 상태는 글자색과 아래 선, `aria-selected`로 전달된다.
- 초점 표시: 탭과 패널 모두 안쪽 `outline`. 패널은 Base UI가 `tabIndex=0`을 주어 Tab 키로 초점을 받는다.
- 탭 이름은 「이름 숫자」로 읽히도록 두 글자 사이에 공백 문자를 둔다(화면 간격은 `gap`).
- 아이콘 탭은 `label`이 `aria-label`이 되고 두 아이콘은 장식이다. 선택 여부는 아이콘 모양·밑줄과 `aria-selected`로 전달된다.
- 비활성 탭(`disabled`)은 흐림(40%)과 `not-allowed` 커서로 표시한다. Figma에 모양이 없어 다른 컴포넌트와 같은 흐림을 썼다.

## Styling과 의존성

| Figma                                                                                      | 구현                                                                                             |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 높이 40, 좌우 22, 이름·숫자 간격 8                                                         | `h-10 px-padding-p11 gap-s4`                                                                     |
| Body-1-Medium                                                                              | `typography-body-1-medium`                                                                       |
| 기본 `text-tertiary`, 선택 `text-primary`                                                  | `text-text-tertiary data-active:text-text-primary`                                               |
| 선택 아래 선 2px `chip-gray-fg`                                                            | `Tabs.Indicator`(`h-0.5 bg-chip-gray-fg`), 탭은 투명 `border-b-2`로 높이 유지                    |
| 아이콘 탭 36×40, 좌우 8·위아래 10                                                          | `px-padding-p4 py-padding-p5`, 아이콘 20                                                         |
| 아이콘 탭 밑줄 1px(기본 `border-tertiary`, 선택 `icon-tertiary`, 비활성 `border-disabled`) | 회색·비활성 선은 탭 `after:h-px`(높이 안쪽), 선택 선은 `Tabs.Indicator`(`h-px bg-icon-tertiary`) |
| 아이콘 Line·Fill photo 20                                                                  | 호출자가 `LinePhotoMediumIcon`·`FillPhotoMediumIcon` 등을 넘김                                   |
| 의존성                                                                                     | `@base-ui/react/tabs`(이미 설치된 Base UI)                                                       |

## 확인할 항목

- 탭 폭 (제안): Figma는 120px 고정이지만 글자 길이에 맞춰 늘고 줄게 했다. 화면 폭을 반씩 나눠 쓰는지 등 배치는 호출 화면에서 정한다.
- 이름·숫자 탭의 눌림·hover 상태는 Figma에 없어 만들지 않았다(아이콘 탭은 Figma `Pressed`대로 눌림 있음).
- 아이콘 탭 터치 영역: 36×40으로 Medium 아이콘 기준 40×40(`design-system-icons.md`)보다 폭이 4px 좁다(Figma 값). 기본 아이콘 `icon-quaternary`(#BCBEC2)의 비텍스트 대비 3:1 여부와 함께 디자이너 확인이 필요하다.
- 터치 높이 (확인): Figma 높이 40px은 권장 44px보다 작다. 가로로 넓어 누르기 어렵지 않다고 보고 Figma 값을 따랐다.

## 검증

- [x] test: 탭 역할·이름, 선택 전환과 패널, 방향키는 초점만 이동(선택 유지), 숫자 생략, 아이콘 탭 이름·선택 전환·장식 아이콘. Enter·Space 선택은 Chromium에서 확인
- [x] Story: Default(팔로워·팔로잉), WithoutCount, WithDisabledTab, IconTabs
- [x] Storybook Chromium 치수·색 대조(아이콘 탭 36×40, 밑줄 1px 색 3종)
- [ ] 스크린 리더·실기기

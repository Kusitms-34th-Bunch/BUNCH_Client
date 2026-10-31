# 컴포넌트: NotificationCard

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Alert_Label`(`2290:42771`: Default·Important × Disabled·Default·Pressed, 기본 카드 `2290:42739`)
- 이슈: #146

## 목적과 범위

- 알림 목록의 카드 한 장. 제목, 시각, 읽지 않음 점, 아래 내용으로 구성된다.
- 누르면 무엇을 할지(알림 대상 화면 이동, 읽음 처리)와 시각 글자 형식(「방금 전」 등)은 호출자가 정한다.
- 목록 묶음(`ul`), 날짜별 구분, 빈 목록 화면은 범위 밖이다.

## Public API

- `title`: 알림 제목(필수). Figma는 번치 이름(`[퇴근런클럽]`)과 제목을 따로 그렸지만 같은 글자 스타일이라 한 문자열로 받는다.
- `description`: 알림 내용(필수).
- `time`: 시각 글자(필수, 예: `방금 전`).
- `important?`: 중요 알림. 제목 앞 20px 경고 아이콘, 제목 `system-fail-text`.
- `unread?`: 읽지 않음. 시각 뒤 4px 빨간 점.
- `disabled?`: 흐리게 표시하고 누를 수 없다. 초점은 받는다.
- `importantLabel?`·`unreadLabel?`: 숨은 글자 바꾸기(기본 `중요`·`읽지 않음`).
- `button`의 나머지 속성(`onClick`, `className`, `aria-*` 등). `type`은 `button` 고정.

## 상태와 동작

- 기본: 바탕 `surface-primary`.
- 눌림: 바탕 위에 `overlay-pressed`를 겹친다(글자색 유지).
- 비활성: `opacity-disabled`(40%)와 제목·내용 `text-disabled`. Figma 그대로 두 가지를 함께 쓴다. 경고 아이콘, 시각 글자, 점은 색을 유지한다.
- 긴 제목·내용은 단어 단위로 줄바꿈한다(`break-keep`). 제목이 여러 줄이면 아이콘과 시각은 첫 줄 가운데에 맞춘다.

## 접근성

- 카드 전체가 `button`이고 접근성 이름은 「(중요,) 제목, 시각(, 읽지 않음), 내용」이다. 쉼표는 숨은 글자로 넣어 붙어 읽히지 않게 한다.
- 중요·읽지 않음은 색과 아이콘·점만이 아니라 숨은 글자로도 전달한다. 아이콘과 점은 장식이다.
- 비활성은 `disabled` 대신 `aria-disabled`를 써서 초점 이동으로 내용을 읽을 수 있게 하고 `onClick`을 막는다(`BunchListItem`과 같은 방식).
- 초점 표시는 `outline-border-brand` 2px.

## Styling과 의존성

| Figma                                                      | 구현                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| 바탕 `surface-primary`, radius `r5`, 좌우 16·위아래 14     | `bg-surface-primary rounded-r5 px-padding-p8 py-padding-p7`   |
| 제목·내용 간격 4, 아이콘·제목 간격 2                       | `gap-s2`, `gap-s1`                                            |
| 제목·시각 양 끝 배치(간격 없음)                            | `justify-between` + 최소 간격 `gap-s4`(긴 제목이 붙지 않게)   |
| 제목 Body-2-Medium `text-primary`(중요 `system-fail-text`) | `typography-body-2-medium`                                    |
| 내용 Body-4-Regular `text-tertiary`                        | `typography-body-4-regular text-text-tertiary`                |
| 시각 Caption-1-Medium `text-quinary`(#bcbec2)              | `typography-caption-1-medium text-text-quaternary`(같은 값)   |
| 비활성 글자 `text-disabled`, 바깥 `opacity-disabled`       | `text-text-disabled`, `opacity-(--semantic-opacity-disabled)` |
| 눌림 overlay(검정 바탕 겹침)                               | `overlay-pressed` 바탕 layer                                  |
| 경고 아이콘 `Line/Icon-M/alert` 20                         | `LineAlertIcon` md                                            |
| 읽지 않음 점 4px #db3c19(red-600)                          | `bg-system-fail-text`(#f04d29, red-500)                       |

## 확인할 항목

- 읽지 않음 점 색: Figma는 semantic 토큰이 없는 red-600(#db3c19)이다. 가장 가까운 `system-fail-text`(red-500)를 썼다. 디자이너에게 토큰 지정을 요청한다.
- 시각 글자: Figma 변수 이름은 `text-quinary`인데 코드 토큰에는 없다. 값이 같은 `text-quaternary`를 썼다.
- 제목이 긴 경우의 처리(줄바꿈 vs 한 줄 말줄임)는 Figma에 없다. 알림 내용을 모두 보여야 해서 줄바꿈으로 정했다.
- 비활성 글자 대비: `opacity-disabled`와 `text-disabled`가 겹쳐 아주 옅다(Figma 그대로). 비활성 알림도 내용을 읽어야 한다면 둘 중 하나만 쓰도록 디자이너와 정한다.
- 비활성 알림이 언제 생기는지(삭제된 번치 등)는 Figma에 없다. 알림 화면 이슈에서 정한다.

## 검증

- [x] test: 접근성 이름, 중요·읽지 않음 숨은 글자와 빈 글자 대체, 클릭, 비활성 초점과 클릭 차단
- [x] Story: Default, Important, Read, Disabled, ImportantDisabled, LongText
- [x] Storybook Chromium 치수·색 대조(높이 72, 아이콘·시각·내용 위치 Figma와 같음)
- [ ] 스크린 리더·실기기

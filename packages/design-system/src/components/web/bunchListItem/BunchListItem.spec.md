# 컴포넌트: BunchListItem

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 번치 전환 시트(`2487:46353`)의 `Label - 01` 인스턴스(`2290:43402`, 흐림 `2290:43500`)

## 목적과 범위

- 번치 목록 한 줄: 36px 대표 이미지, 번치 이름, 표시(알림 개수·접근 불가 등).
- Figma 이름 `Label - 01`은 약관 전체 동의 행(`Label`, `796:4780`)과 같지만 다른 컴포넌트라 이름을 따로 붙였다.

## Public API

- `name`: 번치 이름(접근성 이름). `imageSrc?`: 대표 이미지(없으면 빈 원). `badge?`: 표시 노드.
- `status?`: `default`(기본) | `current`(지금 보고 있는 번치) | `unavailable`(접근 불가).
- native `<button>` 속성. `type`은 `button`, `disabled`는 `status`로 정한다.

## 상태와 동작

- `default`: 누를 수 있고 누르는 동안 `overlay-hover`(10%).
- `current`: 흐림(40%), 누를 수 없음, `aria-current="true"`.
- `unavailable`: 흐림(40%), 이름 `text-disabled`, 표시는 오른쪽 끝, 누를 수 없음.
- 긴 이름은 한 줄에서 말줄임(`truncate`).

## 접근성

- 버튼 이름은 이름, 숨긴 쉼표, 표시 글자를 합친 값이다(예: "여행가조, 알림 5개"). 현재 번치는 숨긴 「, 현재 번치」를 붙인다.
- 현재·접근 불가 번치는 `disabled` 대신 `aria-disabled`라 Tab으로 초점을 받아 상태를 확인할 수 있고, 눌러도 `onClick`을 부르지 않는다.
- 이미지는 장식(`alt=""`).

## Styling과 의존성

| Figma                                              | 구현                                    |
| -------------------------------------------------- | --------------------------------------- |
| 패딩 10·6, 간격 10, radius `r4`, 높이 48           | `px-padding-p5 py-padding-p3 gap-s5`    |
| 이미지 36 원형                                     | `size-9 rounded-full`                   |
| 이름 Body-1-Medium, `text-primary`/`text-disabled` | `typography-body-1-medium`              |
| 흐림 `opacity-disabled`(40)                        | `opacity-(--semantic-opacity-disabled)` |

## 확인할 항목

- 누름 상태 (제안): Figma에 없어 `Button`과 같은 `overlay-hover`(10%)를 썼다.
- 숨겨진 체크 아이콘 (미정): Figma 인스턴스에 숨겨진 `circle-check` 아이콘이 있다. 선택 모드용으로 보이며 쓰임이 정해지면 추가한다.
- 현재 번치 (제안): Figma 첫 행이 흐린 것을 현재 번치로 해석했다.

## 검증

- [x] test 3개: 클릭, 현재 번치 `aria-current`·비활성, 접근 불가 비활성
- [x] Story: Default, WithBadge, Current, Unavailable, LongName
- [x] Storybook(번치 전환 시트 안): 행 높이 48px, 이미지 36px, 흐림 0.4

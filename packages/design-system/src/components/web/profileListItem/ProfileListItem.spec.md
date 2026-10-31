# 컴포넌트: ProfileListItem

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Profile List- 01`(`1741:13815`: Disabled `1630:10005`, Default `2236:39640`, Pressed `2236:39652`)과 `Profile List - Button`(`2236:40679`)
- 이슈: #138

## 목적과 범위

- 사람 한 명을 보여 주는 목록 한 줄: 40px 프로필 이미지(역할 배지 겹침), 이름(「(나)」 같은 덧붙임), 오른쪽 동작 하나.
- 오른쪽 동작은 두 가지로 받는다.
  - 더보기 버튼은 `onMore`로 켜고, 컴포넌트가 직접 그린다.
  - 「차단해제」 버튼, 「추가하기」 칩, 팔로우 버튼 같은 그 밖의 동작은 `action` 슬롯으로 받는다.
- 팔로우 목록 행(별도 이슈)이 이 틀에 오른쪽 동작만 바꿔 재사용한다.
- 행 자체는 누를 수 없다. 누르는 대상은 오른쪽 동작뿐이다(Figma `Pressed`는 더보기 버튼의 눌림).
- 목록 의미(`ul`·`li`)는 호출자가 감싼다.

## Public API

- `name`: 이름(필수). 긴 이름은 한 줄에서 말줄임.
- `suffix?`: 이름 뒤 덧붙임(예: `(나)`). 말줄임되지 않는다.
- `imageSrc?`: 프로필 이미지 주소(없으면 기본 배경색 원). 이미지는 장식이다.
- `memberRole?`·`roleLabel?`: 역할 배지(`RoleBadge` sm). `roleLabel`은 스크린 리더가 읽는 역할 이름이다(예: `번치장`).
- `onMore?`·`moreLabel?`: 더보기 버튼. `moreLabel` 기본값은 `` `${name} 더보기` ``다.
- `action?`: 오른쪽 동작 노드. `onMore`와 함께 주면 `action`만 보인다.
- `disabled?`: 행을 흐리게(40%) 하고, 더보기 버튼을 비활성으로 하고, `action` 슬롯을 `inert`로 감싸 누르거나 초점을 받지 못하게 한다.
- native `div` 속성과 `className`(행에 적용).

## 상태와 동작

- Default: 흰 바탕, 회색 테두리.
- Pressed(더보기 버튼): 20px 원형 `overlay-pressed`(20%)가 점 아이콘 위에 겹친다. 75ms 전환(동작 줄이기에서는 끔).
- Disabled: 행 전체 `opacity-disabled`(40%).
- 긴 이름은 말줄임, `suffix`·배지·동작은 줄어들지 않는다. 말줄임된 이름은 `title`로 전체를 보여 준다(터치 기기는 호출자가 상세 화면으로 연결).

## 접근성

- 더보기 버튼은 아이콘만 있어서 접근성 이름이 필요하다. 기본값은 이름을 포함한 `「<이름> 더보기」`라 목록에서 행끼리 구분된다.
- 더보기 버튼의 아이콘은 20px지만, 누르는 영역은 음수 margin으로 40px을 확보한다.
- 역할 배지는 `roleLabel`이 있으면 이미지(`role="img"`)로 읽히고, 없으면 장식이다. 읽기 순서는 시각 순서와 같다(배지 → 이름 → 덧붙임).
- `suffix` 「(나)」는 괄호째 읽히거나 괄호가 생략될 수 있다. 의미 전달이 중요하면 호출자가 풀어 쓴 문구를 넘긴다.
- 비활성 행의 `action`은 `inert`라 Tab 순서에서도 빠진다.

## Styling과 의존성

| Figma                                                                                                   | 구현                                                                               |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 패딩 12·10, radius `r5`, 테두리 `border-tertiary`, 흰 바탕                                              | `px-padding-p6 py-padding-p5 rounded-r5 border-border-tertiary bg-surface-primary` |
| 이미지·이름 간격 6                                                                                      | `gap-s3`                                                                           |
| 왼쪽 묶음·오른쪽 동작 사이(Figma 없음, 양끝 정렬)                                                       | `gap-s4`(8): 긴 이름일 때 최소 간격, 제안                                          |
| 프로필 이미지 40, 테두리 `border-tertiary`                                                              | `ProfileImage` `size="S"` + `border`                                               |
| 역할 배지 16, 이미지와 12 겹침                                                                          | `RoleBadge` sm + `-ml-3`                                                           |
| 이름 Body-1-Medium, `text-primary`                                                                      | `typography-body-1-medium text-text-primary`                                       |
| 점 아이콘 20, `#BCBEC2`                                                                                 | `LineDotsIcon` md + `text-icon-quaternary`                                         |
| 눌림 원 20, black 20%                                                                                   | `before:bg-overlay-pressed`                                                        |
| (호출자 예시, Story) 「차단해제」 SolidButton 32, 바탕 `surface-tertiary`, 글자 `text-tertiary` Label-S | `Button` `variant="secondary" size="sm"` + `text-text-tertiary`                    |
| 흐림 `opacity-disabled`(40)                                                                             | `opacity-(--semantic-opacity-disabled)`                                            |

## 확인할 항목

- Disabled의 뜻 (제안): Figma에 쓰임 설명이 없다. 행을 흐리게 하고 더보기만 막았다. 예를 들어 "탈퇴한 멤버"처럼 정해지면 문구나 접근성 안내를 추가한다.
- 「차단해제」 글자색 (제안): 기존 `Button` `secondary`는 글자가 `text-primary`라, 이 행에서만 `text-tertiary`로 덮었다. 같은 모양이 반복되면 Button 변형 추가를 검토한다.
- 「추가하기」 칩 (제안): Figma에 숨겨진 `ChipButton`이 있어 `action` 슬롯으로 받을 수 있게만 했다.
- 점 아이콘 대비 (확인): Figma 색 `#BCBEC2`(`icon-quaternary`)는 흰 바탕에서 비텍스트 대비 3:1에 못 미칠 수 있다(계산 전). 더보기가 유일한 진입점이라 디자이너 확인이 필요하다.

## 검증

- [x] test 7개: 이름·덧붙임, 더보기 접근성 이름과 클릭, 비활성 더보기, 비활성 `action` inert, 말줄임 `title`, `action` 우선, 역할 배지 `img` 이름
- [x] Story: Default, Me(역할 배지·「(나)」·더보기 눌림), WithButton(차단해제), WithChip(추가하기), Disabled, DisabledWithButton, LongName
- [x] Storybook Chromium 375폭: 행 343×62, 패딩 10·12, radius 10, 테두리 `#EAEAEA`, 이미지 40, 배지 16(12 겹침), 이름 16/24/500, 비활성 opacity 0.4, 더보기 누르는 영역 40×40, 더보기 눌림 원 확인
- [ ] 스크린 리더(VoiceOver·TalkBack) 실제 읽힘, 실기기

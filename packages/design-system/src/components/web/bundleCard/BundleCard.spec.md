# 컴포넌트: BundleCard

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Bundle_Card_List`(`3213:75442`)
- 이슈: #154, #266

## 목적과 범위

- 번치 상세 화면의 번들 목록 한 줄: 대표 사진, 번들 이름, 참여자 얼굴과 「외 N명」, 삭제 버튼.
- 카드를 누르면 번들을 연다(`onCardClick`). 삭제는 별도 버튼이다(`onDelete`). 두 버튼은 중첩하지 않고 형제로 둔다(`SuggestedBundleCard`와 같은 방식).
- 실제 이동·삭제 확인 대화상자·목록 의미(`ul`·`li`)는 호출자가 정한다.

## Public API

- `title`: 번들 이름(필수, 카드 버튼의 접근성 이름, 길면 한 줄 말줄임).
- `imageSrc`: 대표 사진 주소(필수). 사진은 장식이다(이름이 옆에 있음).
- `members`: `{ name, imageSrc? }[]` 참여 멤버(필수, 빈 배열 가능).
- `onCardClick`: 카드를 눌렀을 때(필수, 동작 없는 버튼 방지).
- `onDelete?`: 삭제 버튼을 눌렀을 때. 없으면 삭제 버튼을 그리지 않는다.
- `deleteLabel?`: 삭제 버튼 접근성 이름(기본 `<번들 이름> 삭제`, 빈 글자도 기본값으로 대체).
- native `div` 속성과 `className`(카드에 적용).

## 상태와 동작

- 상태는 기본 하나다(Figma에 눌림·선택·비활성 없음).
- 카드 눌림(Figma 없음): 카드 전체에 `overlay-hover`(10%)를 겹친다(`SuggestedBundleCard`와 같음).
- 삭제 버튼 눌림(Figma 없음): 원 위에 `overlay-pressed`(20%)를 겹친다.
- 긴 이름은 한 줄 말줄임. 참여자는 `BundleParticipants`로 앞의 3명 얼굴을 4px씩 겹치고, 넘는 인원은 「외 N명」으로 보인다.

## 접근성

- 카드 버튼의 접근성 이름은 「번들 이름, 참여자 N명」이다. 참여자가 0명이면 번들 이름만 읽는다. 얼굴과 「외 N명」은 장식이라 숨기고, 전체 인원은 숨은 글자로 전달한다.
- 삭제 버튼은 아이콘만 있어서 「<번들 이름> 삭제」로 이름을 붙여 목록에서 행끼리 구분한다.
- 삭제 버튼은 보이는 크기 24px, 누르는 영역 32px(Small 아이콘 기준, `docs/architecture/design-system-icons.md`)이다.
- 카드 초점은 카드 테두리에 표시하고, 삭제 버튼은 자기 초점 표시를 가진다.

## Styling과 의존성

| Figma                                                       | 구현                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 사진 128×80, radius `r2`                                    | `h-20 w-32 rounded-r2 object-cover`                                                        |
| 사진·내용 간격 6                                            | `gap-s3`                                                                                   |
| 내용 열: 삭제 줄(24)·이름·얼굴, 간격 4                      | `gap-s2`, 삭제 줄 `h-6 justify-end`                                                        |
| 삭제 원 24, `surface-secondary`, 휴지통 16 #535a61          | `size-6 rounded-full bg-surface-secondary`, `LineTrashcanSmallIcon` + `text-icon-tertiary` |
| 이름 Body-3-Regular, `text-secondary`, 한 줄 말줄임         | `typography-body-3-regular text-text-secondary truncate`                                   |
| `Member Avatar Group`: 얼굴 24 3개, 4px 겹침, 간격 4, 13/18 | `BundleParticipants`                                                                       |

## 확인할 항목

- 카드·삭제 버튼의 눌림 모양과 삭제 확인 여부는 Figma에 없다.
- 이슈 초안의 `Name Chip`(「하율 외 3명」)은 Figma 섹션에서 삭제되어 만들지 않았다.

## 검증

- [x] test: 카드 버튼 이름·참여자 수, 얼굴 3명과 「외 N명」, 카드·삭제 따로 누름, 삭제 버튼 숨김과 빈 라벨 대체
- [x] Story: Default, ManyMembers, FewMembers, WithoutDelete, LongTitle
- [x] Storybook Chromium 치수·색 대조(카드 343×80, 사진 128×80, 내용 열 x134·폭 209, 삭제 24, 이름 y28, 얼굴 y53, #154 기준이라 얼굴 간격은 다시 재지 않음)
- [ ] 스크린 리더·실기기

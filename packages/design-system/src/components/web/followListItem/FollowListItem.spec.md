# 컴포넌트: FollowListItem

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Profile List - 02`(`2500:49347`: Unfollow `2500:49346`, Follow `2500:49348`)와 `Profile List - 3`(`2500:50011`)
- 이슈: #149

## 목적과 범위

- 팔로워·팔로잉 목록과 팔로우 요청 목록의 한 줄: 40px 프로필 이미지, 이름, 비공개 계정 자물쇠, 이름 아래 보조 글자(요청 시각), 오른쪽 동작.
- `ProfileListItem`과 모양이 달라(테두리·radius 없음, 패딩 8, 이름 글자 스타일, 보조 글자 줄) 따로 만든다. `ProfileImage`를 재사용한다.
- 오른쪽 버튼은 `action` 슬롯으로 받는다. 팔로우·팔로잉·승인·거절은 `core/button`의 `Button` `sm`으로 호출자가 만든다(Story 참고).
  - `FollowButton`은 `lg`(48px) 고정이고 「팔로잉」에 화살표가 있어서, 32px·화살표 없는 목록 버튼과 맞지 않는다.
- 행 자체는 누를 수 없다. 프로필로 이동하는 동작, 버튼의 동작, 목록 의미(`ul`·`li`)는 호출자가 정한다.

## Public API

- `name`: 이름(필수). 긴 이름은 한 줄에서 말줄임하고 `title`로 전체를 보여 준다(마우스 올림 전용, 터치 기기는 호출자가 프로필 화면으로 연결).
- `imageSrc?`: 프로필 이미지 주소(없으면 기본 배경색 원). 이미지는 장식이다.
- `isPrivate?`: 비공개 계정. 이름 뒤 16px 자물쇠.
- `privateLabel?`: 자물쇠의 숨은 글자 바꾸기(기본 `비공개 계정`, 빈 글자도 기본값으로 대체).
- `meta?`: 이름 아래 보조 글자(예: `1일 전`). 형식은 호출자가 정한다.
- `action?`: 오른쪽 동작 노드. 여러 개면 8px 간격으로 놓는다.
- native `div` 속성과 `className`(행에 적용).

## 상태와 동작

- 상태는 하나다(Figma에 눌림·비활성 없음). 버튼의 눌림·비활성은 `Button`이 맡는다.
- 자물쇠: `meta`가 없으면 24px 회색 원(`surface-secondary`) 안에, 있으면 원 없이 표시한다(Figma 그대로).
- 긴 이름은 말줄임, 자물쇠·버튼은 줄어들지 않는다. `meta`도 한 줄 말줄임.

## 접근성

- 자물쇠는 장식이고 비공개 여부는 숨은 글자 「, 비공개 계정」으로 전달한다. 읽기 순서는 이름 → 비공개 계정 → 보조 글자 → 버튼이다.
- 버튼 이름이 「팔로우」·「승인」처럼 짧아 목록에서 행끼리 구분되지 않는다. 필요하면 호출자가 `aria-label`(예: `야간러너스 팔로우`)이나 `aria-describedby`로 이름을 잇는다. Story는 `aria-label`로 이름을 잇는 예시를 보여 준다.

## Styling과 의존성

| Figma                                                         | 구현                                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| 흰 바탕, 패딩 8, 테두리·radius 없음                           | `bg-surface-primary p-padding-p4`                                    |
| 이미지·이름 간격 6, 이름·자물쇠 간격 4, 이름·보조 글자 간격 2 | `gap-s3`, `gap-s2`, `gap-s1`                                         |
| 왼쪽 묶음·오른쪽 동작 사이(Figma 없음, 양끝 정렬)             | `gap-s4`(8): 긴 이름일 때 최소 간격                                  |
| 프로필 이미지 40                                              | `ProfileImage` + `size-10 border border-border-tertiary`             |
| 이름 Body-3-Semibold `text-secondary`                         | `typography-body-3-semi-bold text-text-secondary`                    |
| 보조 글자 Caption-1-Regular `text-quaternary`(#969aa0)        | `typography-caption-1-regular text-text-quaternary`                  |
| 자물쇠 `Line/Icon-S/Lock` 16, #535a61                         | `LineLockSmallIcon` + `text-icon-tertiary`                           |
| 자물쇠 원 24, `surface-secondary`, radius `r10`               | `size-6 rounded-full bg-surface-secondary`                           |
| 버튼 사이 간격 8                                              | `gap-s4`                                                             |
| (호출자 예시, Story) SolidButton 32, 좌우 12, Label-S         | `Button` `size="sm"`, `primary` / `secondary` + `text-text-tertiary` |

## 확인할 항목

- 보조 글자 대비: #969aa0은 흰 바탕에서 약 2.8:1로 WCAG 4.5:1에 못 미친다(Figma 그대로). 디자이너에게 대비 개선을 요청한다.
- 자물쇠 원: 두 행의 표시가 다른 것이 의도인지 디자이너에게 확인한다.
- 목록 버튼: 「팔로잉」을 눌렀을 때의 동작(언팔로우 확인 등)은 화면 이슈에서 정한다.

## 검증

- [x] test: 이름·title, 비공개 숨은 글자와 빈 글자 대체, 자물쇠 장식 처리, 보조 글자, 오른쪽 동작 클릭
- [x] Story: Follow, Following, Request, Public, LongName
- [x] Storybook Chromium 치수·색 대조(Follow·Request: 행 높이 56, 이름·자물쇠·버튼 위치와 색 Figma와 같음)
- [ ] 스크린 리더·실기기

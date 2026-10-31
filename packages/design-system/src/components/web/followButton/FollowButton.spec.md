# 컴포넌트: FollowButton

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: 「번치 및 번치 관련 상세 화면 컴포넌트」(`1873:31851`)의 `Follow Button`(`2500:47875`: Follow `2500:47874`, Following `2500:47872`, Request `2500:47873`)
- 이슈: #144

## 목적과 범위

- 프로필 화면의 팔로우 버튼. 상태에 따라 글자와 색이 바뀐다: 「팔로우」 → 「팔로잉 ∨」 → 「팔로우 요청됨」(비공개 계정에 요청한 상태).
- `core/button`의 `Button`(`lg`)을 감싼다. 누르면 무엇을 할지(팔로우, 언팔로우 메뉴 열기, 요청 취소)는 호출자가 정한다.
- 팔로우 목록 행(후속 이슈)이 이 버튼을 재사용한다.

## Public API

- `status`: `follow` | `following` | `requested`(필수).
- `children?`: 글자 바꾸기. 기본값은 상태별로 `팔로우`·`팔로잉`·`팔로우 요청됨`이다.
- `Button`의 나머지 속성(`onClick`, `disabled`, `className`, `aria-*` 등). `size`는 `lg` 고정, `variant`·아이콘은 상태가 정한다.

## 상태와 동작

- `follow`: `primary`(바탕 `surface-inversed`, 글자 `text-inversed`).
- `following`: `secondary` 바탕(`surface-tertiary`), 글자 `text-tertiary`, 글자 뒤 24px 아래 화살표.
- `requested`: `following`과 같은 색, 화살표 없음.
- 눌림·비활성·초점 표시는 `Button`과 같다.
- 폭은 호출자가 정한다(Figma 344px, 화면에서는 `w-full`).

## 접근성

- 접근성 이름은 보이는 글자다(「팔로우」, 「팔로잉」, 「팔로우 요청됨」). 화살표는 장식이다.
- 상태가 글자로 드러나므로 `aria-pressed`는 쓰지 않는다(글자가 바뀌는 토글 버튼에 `aria-pressed`를 함께 쓰면 상태가 두 번 전달된다).
- 「팔로잉」을 눌러 메뉴를 연다면 호출자가 `aria-haspopup`·`aria-expanded`를 넘긴다.

## Styling과 의존성

| Figma                                                      | 구현                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| SolidButton 높이 48, 좌우 24, 간격 8, radius `r4`, Label-L | `Button` `size="lg"`                                  |
| Follow: `surface-inversed`·`text-inversed`                 | `Button` `variant="primary"`                          |
| Following·Request: `surface-tertiary`·`text-tertiary`      | `Button` `variant="secondary"` + `text-text-tertiary` |
| 아래 화살표 24                                             | `LineChevronDownIcon` lg(`rightIcon`)                 |

## 확인할 항목

- 글자색 (제안): `Button` `secondary`는 글자가 `text-primary`라 이 버튼에서만 `text-tertiary`로 덮었다. `ProfileListItem`의 「차단해제」와 같은 조합이 반복되므로, `Button` 변형 추가를 디자이너와 정한다.
- 「팔로잉」을 눌렀을 때의 동작(언팔로우 메뉴 등)과 「팔로우 요청됨」의 취소 여부는 Figma에 없다. 호출 화면 이슈에서 정한다.

## 검증

- [x] test: 상태별 접근성 이름, 「팔로잉」 화살표, 클릭, 글자 바꾸기
- [x] Story: Follow, Following, Requested, Disabled
- [x] Storybook Chromium 치수·색 대조
- [ ] 스크린 리더·실기기

# 컴포넌트: CommentItem

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Comment Item`(node `3281:75881`, `Type=Comment`·`Type2`(답글)·`Type3`(삭제된 댓글)·`Type4`(삭제된 답글))
- 기능 명세: `docs/specs/feed.md` 6.2.7(댓글 목록)
- 이슈: #251

## 목적과 범위

### 제공하는 동작

- 댓글 목록의 한 줄: 프로필 이미지, 닉네임, 번치 이름 배지, 작성 날짜, 본문(줄바꿈 유지), 「답글 N」·「답글 달기」, 오른쪽 위 더보기.
- 답글은 앞에 꺾인 화살표가 붙고 답글 버튼이 없다(답글은 한 단계까지).
- 삭제된 댓글·답글은 「작성자」·「삭제된 댓글입니다」만 보이고 배지·날짜·본문·답글 버튼을 숨긴다.

### 제공하지 않는 동작

- 목록 의미(`ul`·`li`)와 정렬, 날짜 글자 형식, 탈퇴 사용자의 「작성자」 처리, 더보기 메뉴(삭제·신고)는 호출자가 한다.
- 배지 색은 호출자가 번치 성격에 맞춰 `bunchColor`로 넘긴다(TYPE_1~4 → brand·orange·pink·green).
- 삭제된 댓글의 회색 기본 이미지도 호출자가 `avatarSrc`로 넘긴다.

## Public API

- Props: `author`(필수), `avatarSrc`, `bunchName`, `bunchColor`(기본 brand), `date`, `content`, `reply`, `deleted`, `replyCount`(0이면 「답글 달기」), `onReply`, `onMore`, `moreLabel`(기본 `<닉네임> 댓글 더보기`), native `<div>` 속성.
- Figma 이름 대응: `Type=Comment`→기본, `Type2`→`reply`, `Type3`→`deleted`, `Type4`→`deleted`+`reply`. `showReplyCount`→`onReply` 유무.

## 상태와 동작

| 모양        | 여백(Figma)             | 높이(Figma 예시) |
| ----------- | ----------------------- | ---------------- |
| 원댓글      | 위아래 14               | 143              |
| 답글        | 위 8·아래 14, 화살표 16 | 109              |
| 삭제된 댓글 | 위아래 14               | 69               |
| 삭제된 답글 | 위 8·아래 14            | 63               |

## 접근성

- 더보기 버튼 이름은 「수인 댓글 더보기」처럼 작성자를 포함한다. 아이콘 16px에 누르는 영역 40px.
- 답글 버튼 이름은 보이는 글자를 포함하고 작성자로 구분한다: 「수인님 댓글의 답글 1개」·「수인님 댓글에 답글 달기」. 누르는 영역은 위아래 8·좌우 4px 넓혔다.
- 답글은 화면에 보이지 않는 「답글」을 앞에 둬 낭독에서 원댓글과 구분한다.
- 더보기의 누르는 영역은 오른쪽으로 12px, 답글에서는 위로 4px 나간다. 호출자는 좌우 여백 12px 이상을 두고, 목록을 `overflow-hidden`으로 감싸지 않아야 누르는 영역과 포커스 표시가 잘리지 않는다. 삭제된 댓글에는 보통 `onMore`를 넘기지 않는다(이름이 「작성자 댓글 더보기」라 모호함).
- 프로필 이미지·화살표·말풍선 아이콘은 장식.
- 색 대비: 날짜·「답글 N」·삭제 문구 `#969AA0`는 흰 배경에서 2.8:1로 일반 글자 기준(4.5:1)에 못 미친다. 더보기·답글 아이콘 `#BCBEC2`는 1.8:1로 그래픽 기준(3:1)에 못 미친다(Figma 값, 확인할 항목).

## Styling과 의존성

| Figma     | 값                                               | 토큰·클래스                                                                    |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| 프로필    | 34, 테두리 1 `#EAEAEA`                           | `ProfileImage size="XS"`, `outline outline-border-tertiary -outline-offset-1`  |
| 닉네임    | Body-3-SemiBold 14/21 `#25282D`                  | `typography-body-3-semi-bold text-text-secondary`                              |
| 배지      | Caption-1-Regular 12/16, 좌우 6·위아래 2, 반경 6 | `ColorBadge size="md"` + `px-padding-p3 py-padding-p1`                         |
| 날짜      | Caption-1-Regular `#969AA0`                      | `typography-caption-1-regular text-text-quaternary`                            |
| 본문      | Body-3-Regular 14/21 `#25282D`                   | `typography-body-3-regular text-text-secondary whitespace-pre-line`            |
| 답글 버튼 | Body-4-Regular 13/18 `#969AA0`, 아이콘 16        | `typography-body-4-regular text-text-quaternary`, `LineMessageCircleSmallIcon` |
| 간격      | 프로필↔본문 8, 머리↔본문 6, 본문↔답글 10         | `gap-s4`, `gap-s3`, `gap-s5`                                                   |

- `LineMessageCircle*Icon`·`LineCornerDownRight*Icon` 세 크기를 이번에 아이콘 파이프라인에 추가했다(Figma Icon 프레임 `3225:61296·61301·61315`, `3281:65026·65287·65397`).
- 새 dependency 없음. Storybook: `Comment`, `NoReplyYet`, `Reply`, `Deleted`, `DeletedReply`, `BadgeColors`.

## 확인할 항목

- 배지 여백: `ColorBadge` `md`의 기본 여백(좌우 8·위아래 4)이 Figma(좌우 6·위아래 2)와 달라 className으로 맞췄다.
- 회색 글자 대비 2.8:1(Figma 값).
- 누를 수 있는 회색 요소(더보기·답글 버튼)의 대비가 낮다. 눌러야 하는 요소만이라도 `tertiary` 계열로 올릴지 디자이너 확인.

## 검증

- 단위 테스트: 닉네임·배지·날짜·본문 줄바꿈, 「답글 N」·「답글 달기」와 누름, 답글에는 답글 버튼 없음, 삭제된 모양의 숨김, 더보기 이름과 누름.
- Storybook(Chromium) 측정: 원댓글 374×143, 프로필 (0,14) 34, 닉네임 (42,14) 14/21 600 `#25282D`, 배지 12/16 `#454EDF`·`#F1F2FF`, 날짜 (42,37) 12/16 `#969AA0`, 본문 (42,59) 14/21, 답글 (42,111) 13/18, 더보기 (358,14) 16. 답글 109·삭제 69·삭제된 답글 63으로 Figma와 같음. 스크린 리더·실기기는 확인하지 않았다.

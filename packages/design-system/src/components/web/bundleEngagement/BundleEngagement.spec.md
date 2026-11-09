# 컴포넌트: BundleEngagement

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `Bundle Engagement`(node `3982:72803`), `Comment Item`(수, node `3335:79001`)
- 기능 명세: `docs/specs/feed.md` 6.1.3·6.2.6
- 이슈: #253

## 목적과 범위

- 피드 카드·상세 아래의 반응 줄: `LikeButton`, 말풍선과 댓글 수, 선택적으로 오른쪽 `BundleParticipants`.
- 바깥 여백(위 14·아래 8·좌우 16)과 흰 배경까지 포함한다(`3982:72803`). 피드 카드 안에서는 `className="p-0"`로 여백을 뺀다(`4940:100841`).

## Public API

- Props: `liked`·`likeCount`·`onLike`(필수), `commentCount`(필수), `onComment`(없으면 댓글 수는 글자), `members`·`onMembers`, native `<div>` 속성.

## 접근성

- 말풍선 버튼 이름은 「댓글 2」. 누르는 영역은 위아래 10px 넓혀 44px.

## Styling과 의존성

- 하트↔말풍선 간격 14(`gap-s7`), 말풍선 `LineMessageCircleLargeIcon` `icon-secondary`.
- Storybook: `Default`, `WithMembers`.

## 검증

- 단위 테스트: 하트·말풍선 누름, `onComment` 없을 때 글자, `members` 유무.
- Storybook(Chromium) 측정: 375×46, 하트 (16,14) 24, 말풍선 x 65로 Figma와 같음.

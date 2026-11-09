# 컴포넌트: FeedBundleCard

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `Bundle Feed Card`(node `4940:101095`), 사진 `Bundle Photo Card`(`5072:51058`), 반응 줄 `Bundle Engagement`(`4940:100841`)
- 기능 명세: `docs/specs/feed.md` 6.1.3
- 이슈: #253

## 목적과 범위

- 피드 탭의 번들 카드: `BundlePhoto` 썸네일(둥근 대표 사진 한 장, 좌우로 넘기지 않음, 위에 번치·제목·위치·날짜) · 간격 10 · `BundleEngagement`(여백 없이 좋아요·댓글 수와 오른쪽 참여 멤버).
- 좌우 여백(16)은 호출자가 준다.
- 카드 전체가 한 버튼이 아니라 누르는 곳마다 다른 버튼이다: 번치 → 번치 프로필, 참여 멤버 → 참여 멤버 시트, 사진 → 번들 상세, 위치 → 콕하기 시트, 하트 → 좋아요, 말풍선 → 상세 댓글 영역.
- 이동·시트·좋아요 처리와 목록 의미는 호출자가 한다. 기존 `BundleCard`(번치 상세 목록 한 줄)와 출처가 다른 컴포넌트다.

## Public API

- Props: `bunchName`·`bunchImageSrc`·`time`·`onBunchClick`, `members`·`onMembers`, `photos`·`title`·`titleAs`·`location`·`onLocationClick`·`date`·`onPhotoClick`, `liked`·`likeCount`·`onLike`·`commentCount`·`onComment`, native `<article>` 속성.

## 접근성

- `article` 이름은 「여행가조의 번들 제주 3박4일 여행 아카이빙」, 제목은 기본 `h3`(`titleAs`로 변경).
- 사진 버튼 이름에 제목을 넣어(「제주 3박4일 여행 아카이빙 사진 열기」) 피드의 카드끼리 구분한다.

## Styling과 의존성

- 위 하위 컴포넌트만 조합한다. Storybook: `Default`(하트 누르면 수 변경), `TitleOnly`.

## 확인할 항목

- 없음. 예전 카드의 참여 멤버 중복은 새 Figma에서 머리 줄이 사진 위로 옮겨지며 반응 줄에만 남았다.

## 검증

- 단위 테스트: 누르는 곳마다 알림, 사진이 여러 장이어도 대표 사진 한 장.
- Storybook(Chromium) 측정: 폭 343에서 사진 343×429(Figma 430, 4:5)·모서리 24·간격 10·반응 줄 24, 제목 16/24, 순번 없음.

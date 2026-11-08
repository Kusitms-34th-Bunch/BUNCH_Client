# 컴포넌트: LikeButton

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: `Like Item`(node `3335:78953`, `Liked=False·True`), 좋아요 모션(node `4118:103009`)
- 기능 명세: `docs/specs/feed.md` 6.1.3·6.2.6
- 이슈: #253

## 목적과 범위

### 제공하는 동작

- 하트와 좋아요 수. 좋아요하면 채운 주황 하트, 아니면 빈 하트.
- 누르면 하트가 작아졌다 커지는 모션을 한 번 재생한다. 처음 그릴 때는 재생하지 않는다.

### 제공하지 않는 동작

- 좋아요 여부·수의 계산, optimistic 반영과 롤백, 중복 요청 방지는 호출자가 한다.

## Public API

- Props: `liked`(필수), `count`(필수), `label`(기본 「좋아요」), native `<button>` 속성(`type`·`aria-pressed`·`children` 제외).

## 상태와 동작

| 상태      | 하트                                  |
| --------- | ------------------------------------- |
| 좋아요 전 | `LineHeartLargeIcon` `icon-secondary` |
| 좋아요    | `FillHeartLargeIcon` `icon-warning`   |

- 모션: 0.4초 동안 크기 1 → 0.74 → 1.22 → 1, 구간마다 `cubic-bezier(0.5, 0, 0.5, 1)`. Figma는 2초 반복 미리보기이고, 코드는 누를 때 한 번만 재생한다. 색은 0.066초에 바뀌는 Figma와 달리 누르는 즉시 바뀐다.
- 누를 때마다 하트를 새로 그려 연타해도 처음부터 재생한다.
- 동작 줄이기 설정이면 모션 없이 하트만 바뀐다.

## 접근성

- 이름은 「좋아요 4」(숨긴 「좋아요」 + 보이는 수), 상태는 `aria-pressed`.
- 아이콘 24px, 누르는 영역은 위아래 10px 넓혀 44px.

## Styling과 의존성

- 수: Body-3-Regular 14/21 `text-tertiary`, 아이콘과 간격 2(`gap-s1`).
- 모션: `likeMotion.module.css`. 새 dependency 없음.
- Storybook: `Default`, `Liked`(누르면 상태와 수가 바뀜).

## 확인할 항목

- 수가 클 때 표기(예: 1.2천)는 정하지 않았다. 받은 수를 그대로 보인다.

## 검증

- 단위 테스트: 이름과 `aria-pressed`, 누름 알림.
- Storybook(Chromium) 측정: 누른 뒤 60ms 크기 0.77, 240ms 1.18, 끝나면 원래 크기와 `#F04D29`.

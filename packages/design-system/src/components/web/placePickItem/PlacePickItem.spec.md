# 컴포넌트: PlacePickItem

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `PlacePick Item`(node `3583:71236`, `State=Default·Selected`)
- 기능 명세: `docs/specs/feed.md` 6.3.1(장소 콕하기 시트)
- 이슈: #261

## 목적과 범위

- 장소 콕하기 시트의 한 줄: 위치 아이콘(20) · 장소 이름·주소 · `PlacePickButton`.
- 시트, 목록 의미(`ul`·`li`), 콕 취소 확인 모달, API 연결은 호출자가 한다.

## Public API

- Props: `name`(필수), `address`(없으면 줄 숨김), `picked`, `onPick`, native `<div>` 속성.

## 접근성

- 버튼이 줄마다 같은 글자라 `aria-describedby`로 장소 이름을 붙여 구분한다.
- 위치 아이콘은 장식(`aria-hidden`).

## Styling과 의존성

- 좌우 16·위아래 14, 간격 12. 이름 `body-2-medium` `text-secondary`, 주소 `body-4-regular` `text-quaternary`, 아이콘 `icon-quaternary`.
- 긴 이름·주소는 줄바꿈한다(`wrap-break-word`). Figma에는 긴 글자 모양이 없어 정했다.
- Storybook: `Default`, `Selected`, `LongName`.

## 확인할 항목

- 긴 장소 이름을 말줄임할지 줄바꿈할지(지금은 줄바꿈).

## 검증

- 단위 테스트: 이름·주소, 버튼 설명, 누름 알림, 담긴 상태 글자, 주소 없음.
- Storybook(Chromium) 측정: 폭 375에서 줄 높이 68, 버튼 76×36으로 Figma와 같음.

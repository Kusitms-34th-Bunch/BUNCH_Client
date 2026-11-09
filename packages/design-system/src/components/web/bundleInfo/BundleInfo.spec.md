# 컴포넌트: BundleInfo

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `Bundle Info`(node `3415:60928`, 위치·날짜 유무 4가지)와 `Bundle Photo` 썸네일 위의 `BundleInfo`
- 기능 명세: `docs/specs/feed.md` 6.1.3·6.2.3
- 이슈: #253

## 목적과 범위

- 번들 제목, 지도 핀 + 위치(밑줄, 누르면 콕하기 시트), 달력 + 날짜. 위치·날짜가 없으면 그 줄을 숨긴다.
- `detail`: 상세 화면(제목 20/26 `text-secondary`, 줄 14/21 `text-tertiary`, 아이콘 `icon-quaternary`, 제목↔줄 10).
- `overlay`: 사진 위(제목 16/24 흰색(Figma `Bundle Photo Card` `Type=Info`), 줄 13/18 흰색 80% 불투명, 간격 6).

## Public API

- Props: `title`(필수), `location`, `onLocationClick`(없으면 위치는 글자), `date`, `variant`(`detail` 기본·`overlay`), `titleAs`(기본 `h2`), native `<div>` 속성.
- 위치·날짜 글자의 형식(「애월읍 외 1곳」, 「2026년 7월 9일」)은 호출자가 만든다.

## 접근성

- 제목은 제목 요소. 위치·날짜 앞에 숨긴 「위치」·「날짜」를 붙여 아이콘 없이도 구분한다.
- 위치 버튼의 누르는 영역은 위아래 8·좌우 4px 넓혔다. 말줄임은 안쪽 글자에 둬 넓힌 영역이 잘리지 않는다(Chromium에서 위아래 6px 밖을 눌러도 위치 버튼이 받음, 높이 34).

## Styling과 의존성

- 아이콘 `FillMapPinSmallIcon`·`FillCalendarSmallIcon`. `FillCalendar*` 세 크기는 이번에 Figma(`3225:61379·61381·61383`)에서 받아 추가했다.
- Storybook: `Default`, `LocationOnly`, `DateOnly`, `TitleOnly`, `Overlay`.

## 확인할 항목

- 상세의 핀·달력 아이콘 `#BCBEC2`는 흰 배경에서 1.8:1로 그래픽 기준(3:1)에 못 미친다(Figma 값).

## 검증

- 단위 테스트: 제목 요소, 위치 누름, 줄 숨김.
- Storybook(Chromium) 측정: `detail` 343×84, 제목 20/26 `#25282D`, 줄 y 36·63, 아이콘 `#BCBEC2`.

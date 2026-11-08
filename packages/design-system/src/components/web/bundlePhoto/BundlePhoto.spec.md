# 컴포넌트: BundlePhoto

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `Bundle Photo Card`(node `5072:51058`, `Type=Info·Photo`, 피드 썸네일), `Bundle Photo`(node `3982:73847`, 상세), `Page Counter`
- 기능 명세: `docs/specs/feed.md` 6.1.3·6.2.4
- 이슈: #253

## 목적과 범위

- 폭에 맞춘 4:5 사진을 좌우로 넘긴다(가로 스크롤 스냅). 오른쪽·아래 16에 「현재/전체」(`PageCounter`).
- `thumbnail`: 모서리 24 카드. 첫 사진(`Type=Info`)에만 어두운 막(`overlay-dim-subtle`), 위 그라데이션(높이 100)과 번치(`author`, 흰 글자), 아래 그라데이션(높이 124)과 `BundleInfo` `overlay`를 얹는다. 썸네일은 첫 사진에서 순번을 숨기고(정보 유무와 무관) 다음 사진(`Type=Photo`)부터 보인다.
- `detail`: 사진만.
- 사진이 1장이면 순번을 숨긴다.

## Public API

- Props: `photos`(`{ src, alt? }[]`, 필수), `variant`, `info`(제목·위치·날짜), `author`(`name`·`imageSrc`·`time`·`onClick`), `onPhotoClick(index)`, `onIndexChange(index)`(상세 캡션 전환), `photoLabel(index, total)`, native `<div>` 속성.

## 접근성

- `onPhotoClick`이 있으면 사진마다 「번들 사진 2/4 열기」 버튼이 있고, 초점을 옮기면 그 사진으로 넘어간다.
- 없으면(상세) 사진 목록이 「번들 사진」 묶음(`role="group"`)으로 초점을 받아 방향키로 넘긴다. 이때 사진마다 `alt`를 넘기는 것을 권한다(기본은 빈 글자).
- 사진이 많으면 사진 버튼마다 Tab이 멈춰 좋아요까지 멀어진다(확인할 항목).
- DOM 순서: 번치 버튼 → 사진 버튼 → 제목·위치. 화면 위에서 아래 순서로 Tab이 간다.
- 사진 위의 번치·위치 버튼만 사진 버튼 위에서 누를 수 있다(나머지 글자는 `pointer-events-none`). 번치 버튼의 초점 테두리는 흰색(`border-inversed`).

## Styling과 의존성

- 그라데이션은 Figma 값(아래 검정 60%→40%→8%→0, 위 30%→0)을 그대로 썼다(Figma 설명에 「토큰 미적용」).
- Storybook: `Thumbnail`, `Detail`, `SinglePhoto`.

## 확인할 항목

- 사진 1장일 때 순번 숨김은 Figma에 없어 정했다.
- Figma 카드 높이는 430이라 4:5(343 폭에서 429)와 1px 다르다. 비율을 지켰다.
- 사진이 10장 가까이 되면 Tab 이동이 길다. 화면 밖 사진 버튼을 Tab에서 빼려면 키보드로 넘기는 다른 방법이 필요해 지금은 그대로 둔다.
- 흰 글자 대비는 밝은 사진에서 부족하다. 흰 사진이면 위쪽(막 10% + 그라데이션 30%) 배경이 약 #A0A0A0이라 번치 이름·시간이 약 2.6:1이고, 위치·날짜(80%)도 4.5:1에 못 미칠 수 있다. Figma 값(「토큰 미적용」)을 그대로 둬서 디자이너 확인 대상이다. 번치 버튼 흰 초점 테두리도 같은 이유로 3:1을 못 얻을 수 있다.
- 사진 비율이 4:5가 아닐 때는 가운데를 잘라 채운다(`object-cover`).

## 검증

- 단위 테스트: 사진 버튼 이름과 순번 알림, 넘김에 따른 순번·`onIndexChange`, 첫 사진에만 제목, 1장일 때 순번 없음, 첫 사진의 번치 버튼과 순번 숨김.
- Storybook(Chromium) 측정: 피드 카드 폭 343에서 사진 343×429, 모서리 24, 제목 16/24(왼쪽 16), 첫 사진 순번 없음.

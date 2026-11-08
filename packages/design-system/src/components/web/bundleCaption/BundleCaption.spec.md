# 컴포넌트: BundleCaption

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `Comment Card`(node `3383:79133`), `ReadMore`(node `3504:69488`)
- 기능 명세: `docs/specs/feed.md` 6.2.4
- 이슈: #253

## 목적과 범위

- 사진 캡션 상자(회색, 안쪽 14, 반경 10). 2줄을 넘으면 둘째 줄 끝에 「..더보기」, 누르면 전체를 펼친다.
- 내용이 바뀌면(다른 사진으로 넘김) 다시 접힌다. 캡션 없는 사진은 호출자가 그리지 않는다.
- 접기 버튼은 Figma·명세에 없어 만들지 않았다.

## Public API

- Props: `content`(필수, 줄바꿈 유지), `moreLabel`(기본 「..더보기」), native `<div>` 속성.

## 접근성

- 「..더보기」는 이름 「더보기」인 버튼(점은 읽지 않음)이고 펼치면 사라진다. 초점은 펼친 본문(`tabIndex=-1`)으로 옮긴다.

## Styling과 의존성

- 본문 Body-3-Regular 14/21 `text-tertiary`, `line-clamp-2`. 더보기 14 `text-quinary`, 같은 배경색으로 둘째 줄 끝을 덮는다.
- 넘침은 `ResizeObserver`로 다시 잰다. 글꼴이 늦게 불러와져 줄 수가 바뀌는 경우는 다시 재지 않는다(확인할 항목).
- Storybook: `Long`, `Short`.

## 확인할 항목

- 「..더보기」 `#BCBEC2`는 `#F5F5F5` 위에서 1.6:1로 글자 대비 기준에 못 미친다(Figma 값). 누르는 요소라 디자이너 확인.
- 글꼴 로딩 뒤 줄 수가 바뀌면 더보기 표시가 어긋날 수 있다(`document.fonts.ready` 재측정은 실제 화면에서 문제가 보이면 추가).
- Figma `ReadMore` 줄 높이 19.25는 토큰이 없어 본문 21에 맞췄다.

## 검증

- 단위 테스트: 넘칠 때 펼치기와 내용이 바뀌면 다시 접힘, 넘치지 않으면 버튼 없음(jsdom은 높이를 흉내 냄).
- Storybook(Chromium) 측정: 폭 344에서 접힌 상자 70(본문 42), 펼치면 91.

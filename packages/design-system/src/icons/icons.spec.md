# 컴포넌트: Icons

- 소유 경계: `@app/design-system/src/icons`
- 상태: 구현됨(로컬 검증), 원격 Chromatic·실기기 미검증
- 디자인: [Icon 프레임](https://www.figma.com/design/3nvm4AeRaybVAu8kUZv5Mv/BUNCH---%EC%9E%91%EC%97%85%ED%8C%8C%EC%9D%BC?node-id=93-2623&m=dev)

## 목적과 범위

Line 23종·Fill 8종, 아이콘 31종을 크기별 SVG(small·medium·large, 총 93개)에서 SVGR로 변환해 **아이콘당 컴포넌트 하나**로 제공하고 `size`로 크기를 고른다. 크기별 도형(viewBox·선 굵기 포함)을 확대·축소로 대체하지 않는다. 원본을 확인한 결과 세 크기의 도형 구조는 31종 모두 같지만 선 굵기가 다르다(small 1.2, medium·large 1.5). 런타임 이름 레지스트리나 IconButton은 만들지 않는다. 생성 컴포넌트는 asset 파이프라인이 소유하며 수작업 컴포넌트 scaffold 대상이 아니다.

## Public API

- `LineSearchIcon`, `FillCircleCheckIcon`처럼 형태와 이름이 드러나는 아이콘당 named export 하나(총 31개).
- `size?: 'sm' | 'md' | 'lg'`(기본 `md`). `sm` 16×16, `md` 20×20, `lg` 24×24이고 크기마다 Figma가 그린 도형·viewBox·선 굵기를 쓴다. `size`는 `Button`의 `sm`·`md`·`lg`와 같은 이름이다. 공개 타입 `IconSize`, `IconProps`.
- React SVG props, `className`, `ref` 전달. 색은 부모의 `color` 상속.
- 별도 상태·이벤트 API 없음. 클릭·키보드·터치 영역은 호출자의 button/link 책임.
- 장식은 기본 `aria-hidden="true"`, `focusable="false"`. 의미가 있으면 `aria-label` 또는 `aria-labelledby`를 제공해 `role="img"`로 노출. 이 계약은 `size`와 무관하다. 호출자가 넘긴 `aria-hidden`·`role`·`focusable`은 접근성 속성 뒤에 펼쳐지므로 덮어쓸 수 있고 이를 막지 않는다(호출자 책임). `children`(예: `<title>`)은 받지 않는다.
- 아이콘 전용 버튼은 버튼에 이름을 제공하고 SVG는 장식으로 사용. Button 슬롯의 숨김 정책 유지.

## 이름과 크기 확정

2026-10-17 사용자 확인: 아래 이름만 코드에서 정규화하고 도형은 변경하지 않는다.

| 원본 노드 | Figma 이름                  | 코드 이름(아이콘, 크기)  |
| --------- | --------------------------- | ------------------------ |
| 93:2781   | Line/Icon-M/Frame           | `LineSettingIcon`, `md`  |
| 93:2769   | Line/Icon-S/menu-2          | `LineMenuIcon`, `sm`     |
| 118:923   | Line/Icon-L/confetti (20px) | `LineConfettiIcon`, `md` |
| 118:948   | Fill/Icon-L/confetti (20px) | `FillConfettiIcon`, `md` |

Copy·Camera·Close의 대소문자도 파일명에서는 kebab-case로 통일한다.

Line: add, alert, bell, camera, chevron-down, chevron-left, chevron-right, chevron-up, circle-check, close, confetti, copy, dots, dots-vertical, heart, home, menu, pencil, photo, reload, search, setting, user.

Fill: bell, camera, circle-check, confetti, heart, home, photo, user.

## 스타일과 토큰 대응

| Figma 속성                  | 구현                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| 단색 icon-primary (#121212) | SVG `currentColor`, 갤러리 `text-icon-primary`                                                    |
| 아이콘 크기 16/20/24        | `size` `sm`/`md`/`lg`. SVG 원본 width/height/viewBox, 생성기에서 파일명과 검증                    |
| 크기별 선 굵기              | 원본 유지(sm 1.2, md·lg 1.5). 확대·축소로 대체하지 않음                                           |
| 갤러리 배경·문구·간격       | `bg-surface-primary`, `text-text-primary`, `text-text-secondary`, 기존 spacing·typography utility |
| 터치 영역 S40/M44/L48       | 기존 전달값을 문서에 유지, SVG에 padding·클릭 동작 추가하지 않음                                  |

## 입력과 생성 계약

- `svg/`: 검증한 단색 원본을 currentColor로 정규화. 원본 색이 의미를 가지면 `svg-preserve/`로 분리.
- 아이콘마다 `<이름>-small.svg`·`<이름>-medium.svg`·`<이름>-large.svg` 세 개가 있어야 하고, 셋을 묶어 `<이름>Icon` 컴포넌트 하나를 만든다. 하나라도 없거나 파일명이 이 형식이 아니면 생성이 실패한다.
- script·외부 참조·이벤트 속성·DTD 등 위험한 입력 거부, metadata 제거.
- `icons:build`로 TSX 생성 후 `gen:index`로 barrel 갱신. 생성 파일 직접 수정 금지.
- `icons:check`는 도형 변경·누락·stale 생성물을 감지하며 CI의 `check:generated`에 포함.

## 확인할 항목

- [확정] 이름 정규화와 SVG/터치 영역 분리: 사용자 확인 완료.
- [미정] `fill-user`의 medium 도형이 large를 비례 축소한 값과 크게 다르다(좌표 오차 0.67, 나머지 61쌍은 0.6 미만). 의도한 광학 보정인지 디자이너 확인.
- [측정] 번들 비용: 일반적인 사용(소수의 아이콘을 한 크기로)에서는 아이콘마다 컴포넌트 소스 gzip이 평균 560B에서 846B로 약 286B 늘고(원본 1.1KB → 2.4KB), 세 크기 도형이 한 모듈에 있어 tree-shaking으로 줄일 수 없다. 31개를 모두 쓸 때만 이전 93개 합 52KB가 26KB로 줄어든다. 컴포넌트 **소스**를 gzip한 어림값이며 minify·tree-shaking을 거친 앱 번들은 측정하지 않았다.
- [미정] Small 터치 영역 40px의 실제 사용 위치·디자이너 재확인. IconButton 구현 시 확정하며 이번 작업에서 클릭 가능한 UI를 추가하지 않음.
- [미검증] 원격 Chromatic 게시. 기존 workflow가 갤러리 story를 수집하며 이 작업은 게시하지 않음.

## 검증

- 아이콘 31종(Line 23·Fill 8) × 3크기 완전성, 생성기 테스트(크기 누락·파일명 형식 오류 실패, 크기별 선 굵기·viewBox 유지, 접근성 속성 한 번만 부여), SVG 안전성·이름 충돌·색상 보존·drift 테스트.
- 장식/이름 있는 아이콘, ref·className, Button 슬롯 조합 테스트.
- Gallery story 하나로 전체 아이콘 × 3크기 비교.
- `check:generated`, 대상 test·lint·typecheck, Storybook build, 시각 확인 및 UI 접근성 리뷰.
- 이전 구조(93개 컴포넌트)에서 로컬 갤러리 렌더링과 16/20/24px 크기를 확인했고 390px iframe에서 가로 넘침이 없었다. 새 구조에서는 모든 아이콘 × 3크기를 렌더하는 테스트가 통과했고, Storybook 갤러리를 headless Chrome에서 열어 31행 × 3크기, 렌더 크기 16/20/24px, small의 선 굵기 1.2 유지, 93개 모두 장식(`aria-hidden`)임을 DOM으로 확인했다. 실기기 검증은 아님.

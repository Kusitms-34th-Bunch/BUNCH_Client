# 컴포넌트: Icons

- 소유 경계: `@app/design-system/src/icons`
- 상태: 구현됨(로컬 검증), 원격 Chromatic·실기기 미검증
- 디자인: [Icon 프레임](https://www.figma.com/design/3nvm4AeRaybVAu8kUZv5Mv/BUNCH---%EC%9E%91%EC%97%85%ED%8C%8C%EC%9D%BC?node-id=93-2623&m=dev)

## 목적과 범위

Line 23종·Fill 8종, 아이콘 31종을 크기별 SVG(small·medium·large, 총 93개)에서 SVGR로 변환해 **고정 크기 export 93개**와 `size` 선택용 export 31개로 제공한다. 기존 `size` API를 유지하면서 고정 크기 사용의 번들 비용을 줄인다. 크기별 도형(viewBox·선 굵기 포함)을 확대·축소로 대체하지 않는다. 원본을 확인한 결과 세 크기의 도형 구조는 31종 모두 같지만 선 굵기가 다르다(small 1.2, medium·large 1.5). 런타임 이름 레지스트리나 IconButton은 만들지 않는다. 생성 컴포넌트는 asset 파이프라인이 소유하며 수작업 컴포넌트 scaffold 대상이 아니다.

## Public API

- 고정 크기: `LineSearchSmallIcon`·`LineSearchMediumIcon`·`LineSearchLargeIcon`처럼 크기별 named export 93개. `Omit<IconProps, 'size'>`를 받으며 다른 크기 도형을 import하지 않는다.
- 동적 크기: `LineSearchIcon`, `FillCircleCheckIcon` 등 기존 named export 31개. 고정 크기가 아닌 경우에 사용한다.
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
- [미정] `fill-user` medium의 몸통 상단 y=11은 large의 y=14를 20/24로 축소한 11.667과 약 0.667 viewBox 단위 차이가 난다. 원본 SVG와 생성물 모두 이 차이를 유지한다. 의도한 보정인지 디자이너 확인 전에는 비례 축소로 바꾸지 않는다.
- [측정] 번들 비용(2026-10-17 재측정): 같은 아이콘을 md로만 사용할 때 이전 구조 대비 gzip 크기는 1개 723B → 1,179B(+456B), 5개 1,327B → 2,671B(+1,344B), 31개 3,177B → 7,704B(+4,527B)다. 이전 구조는 `6f5d8519bb7460c5f071350d6d5d254bac7100de`의 Medium 컴포넌트, 현재 구조는 같은 이름순 아이콘의 `size="md"` 사용이다. 로컬 macOS·Node 26.10.0·Yarn 4.17.1·Vite 8.1.5 production ES library, minify 활성화, React·jsx-runtime 외부 처리, Node gzip 기본값으로 각 1회 측정했다. 세 크기 도형을 런타임에 고르므로 안 쓰는 크기도 포함된다. 이전 소스 gzip 평균이나 개별 gzip 합계는 이 번들 수치와 비교하지 않는다. 여러 크기 동시 사용과 Next 앱 실제 증분은 미측정이다.
- [미정] Small 터치 영역 40px의 실제 사용 위치·디자이너 재확인. IconButton 구현 시 확정하며 이번 작업에서 클릭 가능한 UI를 추가하지 않음.
- [미검증] 원격 Chromatic 게시. 기존 workflow가 갤러리 story를 수집하며 이 작업은 게시하지 않음.

## 검증

- 아이콘 31종(Line 23·Fill 8) × 3크기 완전성, 생성기 테스트(크기 누락·파일명 형식 오류 실패, 크기별 선 굵기·viewBox 유지, 접근성 속성 한 번만 부여), SVG 안전성·이름 충돌·색상 보존·drift 테스트.
- 장식/이름 있는 아이콘, ref·className, Button 슬롯 조합 테스트.
- Gallery story 하나로 전체 아이콘 × 3크기 비교.
- `check:generated`, 대상 test·lint·typecheck, Storybook build, 시각 확인 및 UI 접근성 리뷰.
- 이전 구조(93개 컴포넌트)에서 로컬 갤러리 렌더링과 16/20/24px 크기를 확인했고 390px iframe에서 가로 넘침이 없었다. 새 구조에서는 모든 아이콘 × 3크기를 렌더하는 테스트가 통과했고, Storybook 갤러리를 headless Chrome에서 열어 31행 × 3크기, 렌더 크기 16/20/24px, small의 선 굵기 1.2 유지, 93개 모두 장식(`aria-hidden`)임을 DOM으로 확인했다. 실기기 검증은 아님.

## 고정 크기 export 보완 검증 (2026-10-17)

- 고정 크기 도형 93개와 선택용 래퍼 31개를 생성하며, 갤러리는 선택용 31개로 전체 크기를 표시한다.
- 93개 고정 export와 기존 size API의 SVG markup·접근성 결과 일치를 검증한다. 정규화 뒤 고정/동적 이름 충돌도 생성 단계에서 거부한다.
- 최상위 공개 barrel에서 `FillUserMediumIcon`만 export한 Vite production 결과에 Medium 도형만 남고 Small/Large·다른 아이콘이 없는지 검사한다. CSS 보존과 불필요한 UI 의존성 제거도 빌드 회귀 검증에 포함한다.
- 로컬 macOS·Node26.10.0·Yarn4.17.1·Vite8.1.5, 동일 아이콘 이름순 md만 사용, production ES library·minify·React/ReactDOM 외부 처리·Node gzip 기본값 각 1회. 이전은 `86ce219539636a2d0a0458cfb22341ffce712464` 통합 모듈, 이후는 최상위 공개 barrel import다. 앱 CSS·Next 실제 증분은 미측정.

| 아이콘 수 | 이전 통합 모듈 gzip | 이후 고정 export gzip | 이후 동적 size API gzip |
| --------- | ------------------- | --------------------- | ----------------------- |
| 1         | 1,179B              | 714B                  | 1,341B                  |
| 5         | 2,671B              | 1,390B                | 2,931B                  |
| 31        | 7,704B              | 3,546B                | 9,214B                  |

고정 크기는 비용이 줄었지만 동적 API는 고정 컴포넌트의 접근성 래퍼 세 개를 참조해 이전보다 증가한다. 동적 사용에서는 이 비용을 수용하며 고정된 크기에 불필요하게 사용하지 않는다. JS를 부수 효과 없음으로 선언하면서 최상위 barrel이 불필요한 Dialog 의존성을 보존하던 문제도 제거했다. 실제 앱 로딩 시간 개선으로 해석하지 않는다.

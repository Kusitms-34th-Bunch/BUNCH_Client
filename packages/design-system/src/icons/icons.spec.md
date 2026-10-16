# 컴포넌트: Icons

- 소유 경계: `@app/design-system/src/icons`
- 상태: 구현됨(로컬 검증), 원격 Chromatic·실기기 미검증
- 디자인: [Icon 프레임](https://www.figma.com/design/3nvm4AeRaybVAu8kUZv5Mv/BUNCH---%EC%9E%91%EC%97%85%ED%8C%8C%EC%9D%BC?node-id=93-2623&m=dev)

## 목적과 범위

Line 23종·Fill 8종의 S/M/L 원본 93개를 SVG → SVGR → React 컴포넌트로 제공한다. 크기별 도형을 확대·축소로 대체하지 않는다. 런타임 이름 레지스트리나 IconButton은 만들지 않는다. 생성 컴포넌트는 asset 파이프라인이 소유하며 수작업 컴포넌트 scaffold 대상이 아니다.

## Public API

- `LineSearchSmallIcon`, `FillCircleCheckLargeIcon`처럼 형태·이름·크기가 드러나는 named export.
- SVG 기본 크기는 Small 16×16, Medium 20×20, Large 24×24. 원본 viewBox 유지.
- React SVG props, `className`, `ref` 전달. 색은 부모의 `color` 상속.
- 별도 상태·이벤트 API 없음. 클릭·키보드·터치 영역은 호출자의 button/link 책임.
- 장식은 기본 `aria-hidden="true"`, `focusable="false"`. 의미가 있으면 `aria-label` 또는 `aria-labelledby`를 제공해 `role="img"`로 노출.
- 아이콘 전용 버튼은 버튼에 이름을 제공하고 SVG는 장식으로 사용. Button 슬롯의 숨김 정책 유지.

## 이름과 크기 확정

2026-10-17 사용자 확인: 아래 이름만 코드에서 정규화하고 도형은 변경하지 않는다.

| 원본 노드 | Figma 이름                  | 코드 이름              |
| --------- | --------------------------- | ---------------------- |
| 93:2781   | Line/Icon-M/Frame           | LineSettingMediumIcon  |
| 93:2769   | Line/Icon-S/menu-2          | LineMenuSmallIcon      |
| 118:923   | Line/Icon-L/confetti (20px) | LineConfettiMediumIcon |
| 118:948   | Fill/Icon-L/confetti (20px) | FillConfettiMediumIcon |

Copy·Camera·Close의 대소문자도 파일명에서는 kebab-case로 통일한다.

Line: add, alert, bell, camera, chevron-down, chevron-left, chevron-right, chevron-up, circle-check, close, confetti, copy, dots, dots-vertical, heart, home, menu, pencil, photo, reload, search, setting, user.

Fill: bell, camera, circle-check, confetti, heart, home, photo, user.

## 스타일과 토큰 대응

| Figma 속성                  | 구현                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| 단색 icon-primary (#121212) | SVG `currentColor`, 갤러리 `text-icon-primary`                                                    |
| 아이콘 크기 16/20/24        | SVG 원본 width/height/viewBox, 생성기에서 파일명과 검증                                           |
| 갤러리 배경·문구·간격       | `bg-surface-primary`, `text-text-primary`, `text-text-secondary`, 기존 spacing·typography utility |
| 터치 영역 S40/M44/L48       | 기존 전달값을 문서에 유지, SVG에 padding·클릭 동작 추가하지 않음                                  |

## 입력과 생성 계약

- `svg/`: 검증한 단색 원본을 currentColor로 정규화. 원본 색이 의미를 가지면 `svg-preserve/`로 분리.
- script·외부 참조·이벤트 속성·DTD 등 위험한 입력 거부, metadata 제거.
- `icons:build`로 TSX 생성 후 `gen:index`로 barrel 갱신. 생성 파일 직접 수정 금지.
- `icons:check`는 도형 변경·누락·stale 생성물을 감지하며 CI의 `check:generated`에 포함.

## 확인할 항목

- [확정] 이름 정규화와 SVG/터치 영역 분리: 사용자 확인 완료.
- [미정] Small 터치 영역 40px의 실제 사용 위치·디자이너 재확인. IconButton 구현 시 확정하며 이번 작업에서 클릭 가능한 UI를 추가하지 않음.
- [미검증] 원격 Chromatic 게시. 기존 workflow가 갤러리 story를 수집하며 이 작업은 게시하지 않음.

## 검증

- 원본 93개·Line23/Fill8 × 3크기 완전성, SVG 안전성·이름 충돌·색상 보존·drift 테스트.
- 장식/이름 있는 아이콘, ref·className, Button 슬롯 조합 테스트.
- Gallery story 하나로 전체 아이콘 × 3크기 비교.
- `check:generated`, 대상 test·lint·typecheck, Storybook build, 시각 확인 및 UI 접근성 리뷰.
- 로컬 갤러리에서 93개 렌더링과 16/20/24px 크기 확인. 390px iframe에서 문서 너비 390px·표 너비 358px으로 가로 넘침 없음. 실기기 검증은 아님.

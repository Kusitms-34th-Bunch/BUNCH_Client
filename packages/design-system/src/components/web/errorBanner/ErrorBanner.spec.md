# 컴포넌트: ErrorBanner

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Page Banner`(node `1782:29900`). 변형 없이 한 가지 모양이다. Figma 이름은 위치(페이지 위)만 말하고 용도를 말해 주지 않아서, 오류 색(`system-fail`)을 쓰는 오류 안내 전용이라는 점이 드러나도록 `ErrorBanner`로 이름을 붙였다.
- 의존: 아이콘 `LinePlugOffMediumIcon`. `LinePlugOff*` 3개 크기는 이 작업에서 Figma(`Line/Icon-{S,M,L}/plug-off`)를 받아 추가했다.

## 목적과 범위

### 제공하는 동작

- 화면 위쪽에 오류 상황(예: 연결 끊김)을 알리는 한 줄 배너. 아이콘, 문구, 오른쪽 밑줄 버튼(예: "재시도")으로 이뤄진다.

### 제공하지 않는 동작

- 닫기 버튼, 자동 사라짐, 위치 고정(`fixed`/`sticky`), 성공·안내 같은 다른 색 변형은 Figma에 없어서 만들지 않았다. 위치와 표시 시점은 호출하는 쪽이 정한다.
- 눌림·비활성 같은 버튼 상태도 Figma에 없다.

## Public API

- Props: `children`(문구), `icon`(기본 연결 끊김 아이콘, `null`이면 숨김), `actionLabel`(없으면 버튼을 그리지 않음), `onActionClick`, 그리고 native `<div>`의 속성(`className`, `role` 등).
- 이벤트: `onActionClick`만 있다. Controlled / uncontrolled: 해당 없음.
- 글자: `typography-body-2-regular`(14/21)로 고정이며 `text-sm` 같은 크기 클래스로는 바꿀 수 없다.
- 호출자 소유 책임: 문구와 버튼 글자(i18n), 표시 여부, 위치, 다시 시도했을 때의 동작.

## 상태와 동작

- 배경 `system-fail-text`(`#F04D29`), 글자·아이콘·밑줄 `system-fail-bg`(`#FFF2EE`). 안쪽 여백 가로 16px(`s8`)·세로 12px(`s6`), 요소 간격 8px(`s4`). 폭은 부모를 채운다(Figma는 375px).
- 아이콘은 Medium(20px)이고 문구는 남는 폭을 채운다. 긴 문구는 줄바꿈하고 버튼은 오른쪽에 그대로 남는다.
- 버튼은 글자(14/21)에 밑줄(`decoration-from-font`, `text-underline-position: from-font`)이고 좌우 6px(`s3`) 여백이 있다.
- 버튼 터치 영역은 보이는 글자 높이(21px)를 위아래로 12px씩 넓혀 배너 높이(45px)만큼 잡는다.

## 접근성

- Semantic element: `<div role="alert">`. 배너가 나타나는 순간 스크린 리더가 문구를 읽는다. 항상 화면에 있는 안내에 쓰면 첫 로드 때 읽히는 정도가 스크린 리더·브라우저마다 달라서 그럴 때는 `role="status"` 등으로 바꿀 수 있다(`role`을 넘기면 덮어쓴다).
- 버튼: native `<button type="button">`이라 form 안에서 제출하지 않고 Enter·Space로 눌린다. 포커스는 `system-fail-bg` 색 2px 윤곽선(배경이 빨강이라 브랜드 보라 대신 밝은 색)으로 보인다.
- 아이콘은 `aria-hidden` 래퍼 안에 그려져 `icon`으로 넘긴 노드도 숨겨진다. 문구가 같은 뜻을 전달하므로 아이콘에 따로 이름을 주지 않는다.
- `actionLabel`이 없거나 빈 문자열이면 버튼을 그리지 않는다(이름 없는 버튼 방지). `onActionClick` 없이 `actionLabel`만 주면 눌러도 아무 일도 없으니 둘은 짝으로 쓴다.
- 터치 영역 확장은 문구가 한 줄일 때 배너 높이와 맞는다. 문구가 두 줄 이상이면 버튼이 세로 가운데에 놓이고 확장 영역은 글자 높이에서 위아래 12px로 고정되어 배너 위아래 끝은 터치되지 않는다.
- 색 대비(토큰 hex로 계산): `#FFF2EE` 글자가 `#F04D29` 배경 위에서 3.3:1이다. 일반 텍스트 AA(4.5:1)에 못 미치고 큰 텍스트 기준(3:1)만 넘는다(Figma 값, 확인할 항목). 아이콘과 밑줄은 비텍스트 대비 3:1을 넘는다. 현재 구현은 텍스트 AA 미달 상태로 Figma 값을 그대로 따랐다.

## Styling과 의존성

- Token: `bg-system-fail-text`(이름은 text 토큰이지만 값이 Figma 배경색과 같고 배경용 `system-fail` 토큰이 없어 이것을 썼다), `text-system-fail-bg`, `px-s8`·`py-s6`·`gap-s4`·`px-s3`, `typography-body-2-regular`.
- 허용되는 dependency 추가 없음.
- Figma 이름 대응: `Page Banner`→`ErrorBanner`, 문구→`children`, `재시도`→`actionLabel`, 아이콘 인스턴스→`icon`.
- Storybook state matrix: `Default`, `WithoutAction`, `CustomIcon`, `LongMessage`.

## 확인할 항목

- 글자 대비 3.3:1(위 접근성 항목). 디자이너 확인이 필요하다.
- 아이콘 교체: Figma에는 연결 끊김 아이콘 하나뿐이지만 "페이지 배너"가 다른 오류에도 쓰일 수 있어 `icon`으로 열었다. 필요 없으면 고정해도 된다.
- 문구가 길 때의 모양, 버튼이 없는 배너, `role="alert"` 사용 여부는 Figma에 정의가 없다.

## 검증

Storybook을 빌드해 Chrome에서 Figma 내보내기(1배, 배경 `#3A3A3A`)와 같은 조건으로 `Default`를 비교했다. 배너 크기 375×45, 아이콘 위치와 크기(16·12.5, 20×20), 버튼 위치(x 310)가 Figma 메타데이터와 같고 배경색 `#F04D29`가 같다. 계산된 스타일은 글자·아이콘 색 `#FFF2EE`, 14/21 Regular(400), 자간 0, 밑줄 `from-font`, 아이콘 선 굵기 1.5로 Figma와 같다. 글자 픽셀은 Storybook에 Pretendard가 없어 대체 글꼴로 그려져서 비교하지 않았다. 스크린 리더(alert 낭독), 키보드 포커스 윤곽선의 실제 모양, 실기기 터치, 강제 색상 모드는 확인하지 않았다.

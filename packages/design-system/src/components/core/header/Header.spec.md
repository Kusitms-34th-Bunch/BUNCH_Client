# 컴포넌트: Header

## 메타데이터

- 소유 경계: design-system
- Status: 구현됨(Storybook 렌더를 Figma 스크린샷과 눈으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Header`(node `127:2053`). Figma는 variant 5개(`LogoHeader`, `Icon`, `Button`, `Bunch Header`, `BundleCreate`)이고 코드는 slot 하나로 표현한다. 2026-10-22 Figma에서 `Searchfield` variant가 빠져 가운데 자유 영역(`children`)을 지웠다.

## 목적과 범위

### 제공하는 동작

- 높이 48px, 좌우 16px, 흰 배경의 상단 바 레이아웃. 왼쪽(`leading`)·제목(`title`)·오른쪽(`trailing`) 세 영역.
- `title`은 `typography-heading-2-semibold`로 한 줄 말줄임한다.
- Figma variant는 slot 조합으로 만든다: `Icon`=뒤로 가기+title+아이콘 버튼, `Button`=뒤로 가기+title+TextButton, `LogoHeader`=leading(로고)+trailing(메뉴), `Bunch Header`=leading(계정 전환)+trailing(아이콘들). `BundleCreate`(14px 제목)는 아직 구현하지 않았다(확인할 항목).

### 제공하지 않는 동작

- 뒤로 가기·검색·메뉴·설정 버튼, 로고, 계정 전환은 제품 요소라서 갖지 않는다. 호출하는 쪽(web)이 조립해 slot에 넣는다.
- sticky·고정 배치, 스크롤에 따른 그림자·투명도 변화는 디자인에 없어서 만들지 않았다. 배치는 `PageShell`의 `header` slot이 맡는다.

## Public API

- Props: `leading`, `title`, `trailing`, 그리고 native `<header>`의 속성(`className`, `aria-*`, `ref` 등). `children`은 받지 않는다.
- 이벤트·controlled: 없음.
- 아이콘 영역: `trailing`이 아이콘 영역이다(간격 16px, 세로 가운데). 어떤 아이콘을 넣을지와 동작은 호출하는 쪽이 정한다. 동작이 붙는 아이콘은 native `button` + `aria-label`로 감싸고, 동작 없는 아이콘은 `aria-hidden`을 준다. 별도 IconButton은 감싸는 코드가 여러 화면에서 반복될 때 승격한다.
- 호출자 소유 책임: slot 요소의 동작·접근성 이름, 제목 문구(i18n), 아이콘 버튼의 터치 영역(`design-system-icons.md` 기준 24px 아이콘 → 48px).

## 상태와 동작

- `title`이 없으면 가운데를 그리지 않고, `trailing`은 `ml-auto`로 오른쪽 끝에 붙는다(`Bunch Header`, `LogoHeader`).
- 긴 제목: 한 줄로 잘리고 `trailing`을 밀어내지 않는다(`min-w-0 flex-1 truncate`).
- loading·error·disabled 상태는 없다(레이아웃 컨테이너).

## 접근성

- Semantic element: `<header>`. 페이지 최상위에 놓이면 `banner` landmark가 된다. 화면에 `PageShell`의 `header` slot과 함께 쓸 때 landmark가 중복되지 않는지 호출하는 쪽이 확인한다(`app-structure.md`는 화면이 `<header>`를 직접 넣게 한다).
- 제목의 heading 수준(`h1` 등)은 호출자가 `title`에 요소를 넘겨 정한다. 문자열이면 heading이 아니다.
- Keyboard·focus: Header 자체는 focus 대상이 아니고 slot 안 요소가 책임진다.

## Styling과 의존성

- Token: `h-s18`(48), `px-padding-p8`(16), `gap-s4`(8), `gap-s8`(trailing 16), `bg-surface-primary`, `text-text-primary`, `typography-heading-2-semibold`. dependency 추가 없음.
- Storybook state matrix: `Default`, `BackAndTitle`, `WithIcons`, `WithTextButton`, `LongTitle`, `TrailingOnly`.

## 확인할 항목

- 배경 토큰 (제안): Figma `background/normal`에 대응하는 토큰이 없어 `surface-primary`(gray-000)를 썼다. 값이 같은지 디자이너 확인.
- 세로 padding (제안): Figma는 variant마다 12/8px을 쓰지만 높이가 모두 48px라서 높이 고정+가운데 정렬로 합쳤다.
- 아이콘 간격과 터치 영역 (미정): 아이콘 간격 16px에 터치 영역 48px(24px 아이콘)이면 인접 터치 영역이 겹친다. 디자인 값 그대로 두었으며 디자이너 확인 필요.
- `BundleCreate` (미정): 2026-10-22 Figma에 제목 14px variant가 생겼다. 제목 크기를 prop으로 받을지는 쓰는 화면이 생길 때 정한다.
- 로고 (미정): `LogoHeader`의 로고는 회색 placeholder(73×24)뿐이라 구현하지 않았다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `header` export 추가)
- [x] 실행 command와 결과: `yarn workspace @app/design-system test`(185)·`gen:index:check`·lint·typecheck 통과
- [x] Storybook 렌더 확인(375px 폭, Figma 스크린샷과 눈 대조). 픽셀 단위 대조와 390px·실기기는 미검증

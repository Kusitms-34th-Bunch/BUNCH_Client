# Architecture Rules

## web

- `src/app`은 Next.js route, layout, metadata와 provider 조립을 담당한다.
- 화면·feature 로직은 `src/features`, 재사용 가능한 인프라는 `src/shared`에 둔다. 디자인 시스템 UI 컴포넌트를 조합해 domain 문구·route·데이터·행동을 붙이는 것은 `src/features`가 맡는다.
- `shared`는 특정 domain이나 route를 import하지 않는다.
- feature 폴더는 역할별로 나눈다(예: `components` UI, `constants` 상수, `hooks` 일반 hook, `contexts` context·provider, `lib`·`utils` 순수 함수, `fixtures` API 연결 전 샘플 데이터·테스트 공용 값). 필요한 폴더만 만들고(빈 폴더는 `.gitkeep`), 정해진 목록은 없다. `features/auth`가 역할 폴더 스캐폴딩의 예이고, `api`처럼 아직 기준이 없는 폴더는 데이터 계층 문서(`docs/architecture/data-layer.md`)가 정해진 뒤 추가한다.
- `components/`에는 UI 컴포넌트와 해당 컴포넌트의 테스트·spec·스타일만 둔다. 공개 컴포넌트 export용 `index.ts`는 예외다. 화면 전용이어도 별도 파일로 분리한 hook은 `hooks/`, 순수 함수는 `lib/`·`utils/`, 라이브러리 연결 래퍼는 `lib/`에 둔다. 상수·타입도 별도 파일이면 각 역할 폴더로 분리한다. 컴포넌트 파일 안의 작은 handler·상수까지 억지로 추출하지 않는다.
- 역할 폴더가 커지면 같은 역할 안에서 화면(흐름)별 하위 폴더로 묶는다(예: `components/join`, `hooks/join`, `lib/join`). 화면 흐름이 같아도 역할이 다른 파일을 `components/join`에 함께 넣지 않는다. 여러 흐름이 쓰는 파일은 해당 역할 폴더 바로 아래에 둔다. 테스트는 대상 구현 파일 옆에 두고, 컴포넌트 spec은 `docs/workflows/spec-writing.md`를 따른다.
- 웹 앱에서 import하는 이미지·로티 등 정적 자산은 `src/shared/assets/`에서 종류별로 관리한다(예: `lotties/`). URL로 직접 제공하는 파일은 `public/`에 둔다. 재생 컴포넌트·hook·도메인 로직은 자산과 함께 옮기지 않고 해당 feature에 둔다.
- `features/<feature>/components/index.ts`는 route가 쓰는 화면 컴포넌트만 내보내는 생성 배럴이다. `yarn gen:feature-index`(`turbo/workflows/gen-feature-barrels.mjs`)가 `src/app`이 `@/features/<feature>/components`에서 import하는 이름을 읽어 만들고, `check:generated`가 최신 여부를 검사한다. 직접 고치지 않는다. route(`src/app`)는 이 배럴로 import하고, feature 내부 파일은 배럴을 거치지 않고 상대 경로로 직접 import한다(순환 import 방지). 내부 부품은 route가 import하지 않으므로 공개되지 않는다. 새 화면을 route에서 쓰기 시작하면 `yarn gen:feature-index`를 실행한다. 화면이 많아져 로드가 느려지면 흐름별 배럴로 나눈다.
- 해당 domain 안에서만 쓰면 `features`에 두고, 두 곳 이상에서 쓰게 되면 `shared`로 올린다.
- 서버 전용 코드는 browser client 경로에 섞지 않는다.
- 화면 틀은 `src/shared/components/layout`의 `AppFrame`(공통 폭·중앙 정렬·화면 높이·Safe Area)과 `PageShell`(`header`·`children`·선택적 `bottom` slot 배치와 본문 스크롤)이 맡는다. `AppFrame`은 일반 화면의 route group `(app)/layout.tsx`에서 한 번만 쓰고(루트 layout은 문서·viewport 같은 전역 경계만 맡는다), 화면은 `PageShell`을 한 번만 써서 영역을 채운다. `<main>` landmark는 `PageShell`만 만들므로 중첩하지 않는다. `header`·`bottom` 슬롯에는 화면이 `<header>`, `<nav aria-label>` 같은 요소를 직접 넣는다(셸은 래퍼를 div로만 둬서 landmark가 중복되지 않는다). 헤더 종류·버튼 동작·본문 좌우 패딩은(사진이 가장자리까지 펼쳐지는 화면이 있어 셸이 강제하지 않음) 화면이 정하고, 번들 룸처럼 별도 스크롤·캔버스가 필요한 화면은 `(app)` group 밖에 두어 폭·Safe Area 틀을 받지 않게 한다(그 화면이 직접 `<main>`을 둔다). 하단 내비게이션 화면의 소유 방식(layout이 `PageShell`을 소유할지, 각 page가 `bottom`에 넣을지)은 탭 화면을 구현할 때 정한다. layout이 `PageShell`을 소유하면 그 하위 page는 `PageShell`을 쓰지 않아야 `<main>`이 중첩되지 않고, 헤더가 화면마다 다르면 각 page가 `bottom`에 넣는 쪽을 택한다.
- route 폴더에는 metadata, loading·error 경계, 얇은 조립만 둔다. route 안에서만 쓰이는 UI·hook·utility는 해당 route의 private 폴더에 가깝게 둔다.
- 다른 route에서도 같은 사용자 행동과 계약으로 재사용될 때만 domain feature로 올린다. 파일 수나 이름의 유사성만으로 공통화하지 않는다.
- dynamic segment, search parameter, redirect는 route 경계에서 해석·검증한다. 검증되지 않은 URL 입력을 domain 전체에 전파하지 않는다.
- lazy loading은 초기 bundle 또는 상호작용 지연이 측정된 경우에만 사용하고 loading fallback과 오류 경계를 함께 제공한다.

## admin

- `src/routes`는 TanStack Router 파일 기반 route 정의와 route-level 설정만 담당한다.
- `src/pages`는 화면을 조립하고, 사용자 행동 단위 로직은 `src/features`에 둔다.
- 공용 UI는 `src/components`, API 호출은 `src/api`, 재사용 유틸리티는 `src/lib`에 둔다.
- 새로운 공통화는 실제 두 곳 이상에서 필요해진 뒤에 한다.
- route 파일에는 path, search validation, loader·prefetch, access control과 page 연결만 둔다. 화면 조립은 `pages`, 사용자 행동 단위는 `features`가 소유한다.
- 한 page 안에서만 쓰이는 section, hook, utility는 page 가까이에 두고, 여러 page에서 같은 계약으로 재사용될 때 feature 또는 app 공용으로 승격한다.
- route parameter와 search input은 type만 믿지 않고 route 경계에서 검증한다. loader가 준비한 서버 상태와 component query의 책임을 중복하지 않는다.

## shared packages

- 디자인 시스템은 framework-agnostic React UI, token, utility만 공개한다.
- 앱 전용 layout, business rule, API hook은 디자인 시스템으로 올리지 않는다.
- 외부 consumer는 package public export를 사용한다. package 내부 구현은 가까운 파일 경로를 사용한다.

# Architecture Rules

## web

- `src/app`은 Next.js route, layout, metadata와 provider 조립을 담당한다.
- 화면·feature 로직은 `src/features`, 재사용 가능한 인프라는 `src/shared`에 둔다.
- `shared`는 특정 domain이나 route를 import하지 않는다.
- 서버 전용 코드는 browser client 경로에 섞지 않는다.
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

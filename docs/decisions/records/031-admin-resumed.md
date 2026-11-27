# 031: apps/admin 기능 개발 보류를 해제하고 운영 도구로 개발한다

- 상태: accepted
- 기록일: 2026-11-27
- 대체: [004: apps/admin은 scaffold로 유지하고 기능 개발은 보류한다](./004-admin-deferred.md)
- 구현 상태(2026-11-27 #590 확인): 디자인 시스템 admin 구역과 기본 컴포넌트를 #590에서 시작한다. 화면·인증·API는 미구현이다.

## 배경

004는 admin이 실제로 필요한지 확정되지 않아 기능 개발을 보류했다. 재검토 조건은 "운영·검수·콘텐츠 관리처럼 admin 전용 요구가 생길 때"였다. 2026-11-27에 운영용 화면설계서가 나왔다. 화면은 로그인, 회원 조회·정지, 신고 조회·처리, 번치 스팟 관리다. 004의 재검토 조건을 충족해 보류를 해제한다.

## 결정

- `apps/admin`에서 운영 도구 기능을 개발한다.
- 앱 구조는 지금 scaffold(Vite + TanStack Router SPA)를 유지한다.
  - 화면이 검색 조건(탭·검색어·페이지 번호)을 가진 목록 중심이다. TanStack Router는 이 조건을 URL search params에 타입과 함께 검증해 둘 수 있다.
  - 데이터 계층이 web과 같은 TanStack Query라 route loader와 캐시를 연결하기 쉽다.
  - 운영 도구라 SSR이 주는 첫 화면 속도·검색 노출 이점이 작다.
- Figma에 정의된 어드민 UI 컴포넌트는 디자인 시스템의 `admin` 구역에 둔다(010의 배치 기준). 구역 규칙은 `docs/architecture/design-system-components.md`를 따른다.
- 인증·API 연동 방식은 백엔드와 협의한 뒤 별도 결정으로 기록한다(미정). 그 전에는 인증·BFF 코드를 만들지 않는다.

## 검토한 대안

- **보류 유지**: 운영 화면설계서가 나와 보류할 이유가 없다.
- **React Router 프레임워크 모드로 교체**: 서버 loader·action과 SSR을 쓸 수 있다. 어드민에는 SSR 이점이 작고, URL 검색 조건을 직접 파싱해야 한다. 서버가 꼭 필요해지면 인증 결정에서 다시 비교한다.

## 영향

- admin이 build·lint·typecheck·test 대상에서 실제 코드를 갖게 된다.
- 디자인 시스템에 세 번째 구역(`admin`)이 생겨 generator, 구조 검사, barrel, ESLint 의존 방향 설정이 늘어난다.

## 검증 / 후속 작업

- `yarn check:generated`, `yarn lint`, `yarn typecheck`에서 admin 구역과 admin 앱이 통과하는지 확인한다.
- 어드민 인증·API 연동 방식을 결정하면 새 기록을 추가한다.

## 재검토 조건

- 어드민 인증에 서버(BFF)가 필요하다고 정해지면 → SPA 유지와 프레임워크 전환을 다시 비교한다.
- 운영 도구 요구가 사라지면 → 004의 삭제 검토 조건을 다시 적용한다.

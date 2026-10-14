# Routing And Access

route는 URL을 component로 연결하는 파일이 아니라, URL 입력·접근 조건·redirect·layout·초기 data 진입을 선언하는 경계다. 실제 인증 방식과 역할은 도입된 구현과 feature spec이 source of truth다.

## route spec에 먼저 적을 항목

- path, dynamic parameter, search parameter와 invalid input 처리
- public, authenticated, role-restricted 중 접근 수준과 확인 근거
- 직접 URL 진입 시 layout·redirect·not-found 동작
- page가 반드시 기다려야 할 data와 부분 loading이 가능한 data
- 완료 뒤 이동, browser back, URL state 동기화

## app별 책임

| App   | route가 소유하는 것                                               | 화면이 소유하는 것                            |
| ----- | ----------------------------------------------------------------- | --------------------------------------------- |
| web   | Next segment, metadata, server/client boundary, layout·redirect   | domain 조립, 사용자 상호작용, route-local UI  |
| admin | TanStack path, params/search validation, loader·prefetch·redirect | page 조립, feature action, table·form·상태 UI |

route는 raw API 요청, domain mutation, 복잡한 form state, 재사용 UI 구현을 직접 품지 않는다.

## 접근과 redirect

- 접근을 막는 route guard와 public 화면 안에서 특정 action만 막는 UI gate를 구분한다.
- redirect 대상, 원래 목적지 보존 여부, 권한 부족과 인증 만료의 사용자 경험을 spec에 적는다.
- client-only storage 값만으로 server 접근 제어가 완료됐다고 간주하지 않는다.
- 역할·권한 체계가 아직 확정되지 않았으면 임의의 enum, middleware, route group을 만들지 않고 확인할 항목으로 남긴다.

## URL과 data

- path와 search parameter는 외부 입력이다. type assertion이 아니라 route 경계 validation과 fallback을 둔다.
- response를 바꾸는 search parameter는 query key에 포함한다.
- loader·server data와 component query가 같은 request를 중복 소유하지 않게 한다. prefetch는 navigation 체감 개선 근거가 있을 때 사용한다.
- lazy loading은 측정된 초기 bundle 또는 interaction 비용을 줄일 때만 사용한다. fallback·error state 없이 route만 lazy하게 만들지 않는다.

## 검증

- direct URL, invalid params/search, not-found, refresh, browser back
- public·protected·role-restricted 동작 중 해당 범위
- loading, error, empty, redirect, forbidden 상태
- URL 변경 뒤 query·form·selection state의 보존 또는 초기화 규칙

route의 장기 접근 정책이나 URL 공개 계약을 바꾸면 `docs/decisions/` 기록 필요성을 함께 판단한다.

# Page·Route 가이드

이 문서는 화면과 route 작업의 공통 절차다. 구현은 `create-page-feature`, form은 `implement-form-flow`, API는 `integrate-api` skill을 사용한다.

## 시작 조건

- 대상 app, URL path, 권한, params/search params, 완료 후 이동을 확인한다.
- web은 Next App Router, admin은 TanStack Router의 실제 route 패턴을 먼저 읽는다.
- API·디자인·권한이 미확정이면 page layout만 만들고 사용자 동작을 추측하지 않는다.

## 소유 규칙

| 책임                                                 | 위치                     |
| ---------------------------------------------------- | ------------------------ |
| URL, params/search validation, redirect, layout 진입 | route                    |
| 화면 조립과 route-local UI                           | page/route 가까이        |
| 여러 화면의 사용자 작업                              | feature/domain           |
| 앱 공용 UI                                           | 해당 app 공용 영역       |
| cross-app UI primitive                               | `packages/design-system` |

## 구현 체크리스트

- [ ] direct URL, invalid params/search, auth redirect 확인
- [ ] loading/error/empty/disabled/success 상태 설계
- [ ] route 파일에 raw request·복잡한 form state·재사용 UI 구현을 넣지 않음
- [ ] 390px, 긴 text, overflow, keyboard/focus, accessible name 확인
- [ ] metadata·SEO는 web 공개 page에만 필요한 범위로 적용
- [ ] route/page spec이 있으면 contract와 verification 갱신

## 완료 기준

- route와 화면·feature·shared의 소유 경계가 설명 가능하다.
- target app lint/typecheck/build, 관련 test 또는 수동 UI 검증을 실제로 기록한다.

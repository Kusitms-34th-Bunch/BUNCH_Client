---
name: create-page-feature
description: 저장소 ownership, 접근성, 검증 기준으로 앱 page, route, route-local UI를 생성하거나 수정한다. web 또는 admin 화면과 route 작업에 사용한다.
---

# Page·Route 구현

## 목적

route는 URL·권한·layout·data 진입을 연결하고, page는 화면을 조립한다. 화면 전용 UI를 성급하게 feature나 design system으로 올리지 않으면서도 사용자 상태와 검증 기준을 빠뜨리지 않는다.

## 입력 점검

### 필수

- 대상 app과 URL path
- 접근 조건, params/search params, layout
- 화면의 성공 조건과 완료 후 이동

### 필요하면 확인

- API contract, loading/error/empty states, feature flag
- SEO/metadata(web 공개 페이지), 모바일 viewport, 이미지·asset
- 기존 화면과의 navigation·redirect 영향

route, 권한, 완료 이동, API 계약이 모호하면 route scaffold만 만들고 동작을 추측하지 않는다.

## 읽기 순서

1. `docs/architecture/app-structure.md`, `docs/architecture/domain-ownership.md`, `docs/architecture/routing-and-access.md`
2. `docs/architecture/components.md`, `docs/architecture/component-patterns.md`
3. `.agents/guides/page-feature.md`, 대상 앱 `AGENTS.md`
4. 가까운 route, page, layout, test, `*.spec.md`
5. API가 있으면 `docs/architecture/data-layer.md`와 `integrate-api` 기준
6. `docs/conventions/coding.md`의 주석 규칙

## App별 route 책임

| App   | route가 맡는 일                                                              | 화면 소유 기준                                                          |
| ----- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| web   | Next App Router의 segment, metadata, server/client 경계, route layout        | `src/app`은 route 진입, `src/features`는 feature 화면 조립              |
| admin | TanStack Router의 path, params/search validation, loader·redirect, page 조립 | `src/routes`는 router 계약, `src/pages`·`src/features`는 화면·작업 흐름 |

- route 파일에 복잡한 form state, raw API request, 재사용 UI 구현을 쌓지 않는다.
- 다른 route 하나에서만 쓸 UI는 route/page 가까이에 둔다.
- 여러 화면의 동일 사용자 작업은 feature에 두고, Figma에 정의된 UI 컴포넌트는 design system에 둔다. DS 컴포넌트를 조합해 문구·route·데이터를 붙이는 일은 feature가 맡는다.

## 구현 순서

1. route contract를 정리한다: URL, params/search, access, layout, initial state, exit/navigation.
2. 현재 router 방식으로 route를 만들거나 수정하고 params/search validation과 invalid URL 동작을 정의한다.
3. page는 view model과 local component를 조립한다. dense logic만 hook이나 feature로 추출한다.
4. API·form은 전용 skill의 boundary를 사용한다. page가 transport나 cache 규칙을 직접 소유하지 않는다.
5. 아래 상태를 화면 성격에 맞게 구현한다.

| 상태     | 확인 내용                                       |
| -------- | ----------------------------------------------- |
| loading  | skeleton/placeholder와 기존 content 보존 정책   |
| error    | recovery·retry, 접근 권한 오류와 일반 오류 분리 |
| empty    | 데이터 없음이 정상인지와 다음 행동              |
| disabled | 조건과 이유가 접근 가능하게 설명되는지          |
| success  | success feedback, cache 반영, redirect/reset    |

6. responsive·a11y pass를 수행한다: 390px, 긴 텍스트, overflow, keyboard, focus, heading 구조, accessible name, error announcement.
7. params/search, route ownership, data dependencies가 문서화되어 있으면 spec을 함께 갱신한다.

## 완료 기준

- 직접 URL 진입, params/search 변경, 권한 redirect, layout 영향이 확인됐다.
- route·page·feature·shared·design system의 소유 경계가 설명 가능하다.
- UI 상태와 접근성·responsive 확인이 변경 범위에 맞게 끝났다.
- 관련 test와 `yarn lint`, `yarn typecheck`, 대상 app build 또는 수동 검증을 실제로 실행·기록했다.
- 완료를 보고하기 전에 `bunch-route-reviewer`(UI가 포함되면 `bunch-ui-accessibility-reviewer`도)를 호출한다(`docs/agent/bootstrap.md`의 필수 호출 기준). 호출하지 않았다면 호출했다고 쓰지 않는다.

## 출력

route contract, 소유 구조, 지원 상태, API/form 연결, 문서 영향, 실행한 검증과 남은 가정을 정리한다.
설치되지 않은 router 기능, 확정되지 않은 도메인 폴더, 미래 재사용만을 근거로 한 공통화는 추가하지 않는다.

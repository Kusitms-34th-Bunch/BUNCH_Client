---
name: verify-spec-sync
description: 기능 spec, route·component·hook 공개 계약, API 계약과 구현을 대조해 사용자 관찰 동작의 불일치를 찾는다. 구현 전후의 spec 동기화 점검에 사용한다.
---

# Spec 동기화 검증

## 먼저 읽기

1. `docs/workflows/spec-writing.md`
2. 대상과 같은 폴더의 `*.spec.md` 또는 `.agents/templates/`의 알맞은 형식
3. 관련 route, page, component, hook, query·mutation, test
4. API가 있으면 `docs/architecture/data-layer.md`

## 점검 순서

1. spec의 목적, 사용자 흐름, public API, 상태, 완료 기준을 읽는다.
2. 구현과 대조한다.
   - route path, 접근 조건, redirect, layout
   - component·hook의 props, 반환값, 상태 전이
   - request·response field, error, cache 갱신
   - loading, empty, error, disabled, success와 접근성 피드백
3. 테스트가 spec의 핵심 동작을 실제로 검증하는지 확인한다.
4. 불일치를 아래 세 범주로 구분해 보고한다.
   - 구현이 spec과 다름
   - API 계약이 spec과 다름
   - spec에 결정이 빠짐

## 출력

- 확인한 spec·코드·테스트 경로
- 일치한 핵심 계약
- 불일치와 영향 범위
- spec 갱신, 코드 수정, 백엔드 확인 중 필요한 다음 작업

## 경계

- 기본 동작은 읽기 전용이다. 사용자가 명시하지 않으면 spec이나 코드를 자동으로 맞추지 않는다.
- 확정되지 않은 API·기획 항목을 임의로 결정하지 않는다.

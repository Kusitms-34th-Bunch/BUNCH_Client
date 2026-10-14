---
name: implement-form-flow
description: 저장소의 컴포넌트·데이터 계층 기준으로 접근성 있는 form, validation, 제출, 서버 오류 흐름을 구현한다. input, multi-step, mutation 기반 form 작업에 사용한다.
---

# Form 흐름 구현

## 읽기와 입력

`docs/conventions/coding.md`, `docs/architecture/components.md`, `docs/architecture/data-layer.md`, `.agents/guides/form-flow.md`, 가까운 form·mutation·test를 읽는다.

아래가 확인되지 않으면 submit 동작을 추측하지 않는다.

- field와 초기값의 출처
- client validation, 서버 오류 response, 오류 표시 시점
- submit 가능 조건과 pending 중 동작
- 성공 뒤 cache, reset, redirect, feedback

## 설계 순서

1. 입력, 파생 상태, validation, submit 조건을 표로 정리한다.
2. field·validation·error·payload를 같은 feature 경계에 두고 design-system primitive에는 UI 계약만 전달한다.
3. label, help, error를 control과 연결하고 required·invalid·disabled·pending을 접근 가능하게 표현한다.
4. validation failure와 auth·network·server failure를 구분해 mapping한다.
5. mutation pending 중 중복 제출을 막고, 성공·실패·retry·cancel/reset의 기대 동작을 명시한다.
6. cache 처리는 `integrate-api`의 query key·invalidation 규칙으로 구현한다.
7. multi-step일 때는 단계별 저장 범위, 이전 이동, 완료 조건, 이탈·복구 동작을 분리한다.

## 검증 기준

- keyboard submit과 invalid field focus/안내를 확인한다.
- 입력, invalid submit, pending, 서버 오류, success를 관찰 가능한 결과로 test한다.
- 여러 화면을 지나는 핵심 success flow만 E2E 후보로 올린다.

## 출력과 금지

field 계약, validation·error mapping, mutation/cache 영향, 접근성, 실행한 검증과 미실행 이유를 보고한다.
placeholder만으로 label을 대신하거나, 임의 timeout·전역 상태로 form state를 숨기지 않는다.

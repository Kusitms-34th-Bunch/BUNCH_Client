---
name: review-changes
description: 현재 변경을 저장소 구조, 데이터 계층, 테스트, 접근성, workspace 규칙 기준으로 읽기 전용 리뷰한다. PR 전 또는 의미 있는 구현 뒤 리뷰에 사용한다.
---

# 변경 사항 리뷰

## 리뷰 원칙

실제로 병합 뒤 문제가 될 가능성이 있는 결함만 찾는다. style 선호, formatter가 잡는 항목, 확인 근거 없는 추측은 finding으로 부풀리지 않는다. 리뷰와 수정은 분리한다.

## 범위 확정

1. `git status --short`, base 대비 commit·diff, 대상 workspace `AGENTS.md`를 확인한다. `git diff --name-only`로 변경 파일 목록을 먼저 확보하고, 리뷰 끝에 이 목록과 실제로 살펴본 파일을 대조해 빠진 파일이 없는지 확인한다.
2. Git diff를 사용할 수 없으면 검토할 파일 목록과 비교 기준을 먼저 명시한다.
3. 변경 유형에 맞춰 architecture, data-layer, testing, verification, code-quality 문서를 필요한 만큼만 읽는다.
4. generated file, lockfile, binary, asset은 변경 의도 또는 consumer 영향이 있을 때만 별도로 살핀다.
5. 연결된 spec·이슈·PR 설명이 있으면 diff와 대조해 명시된 요구사항 중 빠진 부분과, 요청 범위 밖으로 커진 변경(scope creep)을 확인한다. 연결된 문서가 없으면 이 항목은 생략한다.

## 검토 순서

### 1. 동작과 회귀

- 요청된 동작이 diff에서 완성되는지, 정상·실패·빈 상태와 이전 사용 흐름을 깨지 않는지 확인한다.
- nullability, async race, stale closure, error propagation, duplicate submit, redirect·authorization 경계를 확인한다.

### 2. 구조와 의존성

- route/page/feature/shared/design-system, app/package import 방향이 현재 소유 경계에 맞는지 확인한다.
- app이 다른 app을 의존하거나 shared package가 app·route를 import하지 않는지 확인한다.
- public export를 우회한 deep import, 순환 의존, 실제 재사용 없는 공통화를 확인한다.
- 이름만으로 동작을 알 수 없는 함수·타입, 여러 곳에서 항상 함께 다니는 필드·인자 묶음, 도메인 개념을 감싸지 않은 원시값 그대로의 반복 사용이 있으면 근거로 남긴다.
- 한 함수가 다른 모듈의 데이터를 자신의 책임보다 더 많이 다루거나, 같은 타입에 대한 분기·switch가 여러 파일에 반복되면 지적한다.
- `a.b().c().d()`처럼 호출자가 내부 구조를 그대로 타고 들어가는 체이닝이나, 위임만 하고 실질 로직이 없는 wrapper는 실제 재사용 이득이 있는지 확인한다.

### 3. API와 server state

- endpoint contract, generated type boundary, query key parameter, finite/infinite 분리, mutation cache 처리를 확인한다.
- loading/error/empty/pending/success UI와 auth·validation·network error의 구분을 확인한다.

### 4. UI·접근성·성능

- semantic HTML, role/name, keyboard·focus, error announcement, disabled control을 확인한다.
- 긴 text, 390px 수준 viewport, overflow, layout shift, image·font 영향을 확인한다.
- render loop, waterfall, 불필요한 client bundle 증가는 관찰 근거가 있을 때만 지적한다.

### 5. 검증과 문서

- 변경 위험에 맞는 test와 실제 command 결과가 있는지 확인한다.
- 구조·계약·generator·agent 규칙 변경이 관련 docs와 동기화됐는지 확인한다.

### 6. 보안

- 사용자 입력 렌더링, 인증·권한 경계, 새 API·외부 fetch, secret을 다루는 변경이면 `docs/workflows/security-review.md`의 확인 항목을 적용한다.
- 경계·통제·노출 대상을 구체적으로 답할 수 없는 이론적 취약점은 finding으로 올리지 않는다.

## 심각도

| 수준       | 기준                                                           |
| ---------- | -------------------------------------------------------------- |
| Critical   | 데이터 손상, 보안 노출, 서비스 불가, 확실한 광범위 회귀        |
| Major      | 일반 사용 흐름 실패, 잘못된 cache·권한·계약, 병합 전 수정 필요 |
| Minor      | 제한된 edge case 또는 명확한 유지보수 위험                     |
| Suggestion | 선택 가능한 단순화·명확화, 동작 결함 아님                      |

## 출력

각 finding은 아래 형식을 지킨다.

```markdown
### [Major] 짧은 제목

- 위치: `path/file.ts:42`
- 문제: 관찰한 사실
- 영향: 사용자·데이터·유지보수 영향
- 수정: 최소 수정 방향
- 전제: 불확실한 계약 또는 추가 확인 사항
```

finding의 `위치` 줄 번호는 보고 직전 diff hunk와 다시 대조해 실제 코드 위치와 어긋나지 않는지 확인한다.

finding이 없으면 검토 범위, 실행하지 못한 검증, `Approve 가능` 또는 `추가 확인 필요`의 근거를 적는다. 파일 수정, commit, push, PR 게시를 하지 않는다.

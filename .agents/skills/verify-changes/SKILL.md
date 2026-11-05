---
name: verify-changes
description: 현재 변경 범위에 맞는 근거 기반 검증을 선택하고 실행한다. 구현 뒤, handoff 전, verify·test·lint·typecheck·build 요청에 사용한다.
---

# 변경 검증

## 원칙

실제 변경과 실행한 명령으로만 완료를 주장한다. 가장 작은 검증으로 시작하고 실패한 선행 조건을 해결하지 않은 채 넓은 검증을 실행하지 않는다.

## 입력 점검

1. `git status --short`와 변경 파일을 확인한다. Git 정보가 없으면 대상 경로와 변경 목적을 기준으로 범위를 명시한다.
2. `docs/workflows/verification.md`, 대상 workspace `package.json`, 관련 test·build 설정을 읽는다.
3. 변경을 문서·agent, component·hook, API·utility, design system, app route/build, 핵심 사용자 흐름으로 분류한다.

검사 실행 전에 `docs/workflows/verification.md`의 "검증 결과 재사용과 재실행"에 따라 기존 근거를 확인한다. 메인 세션은 검사별 담당자를 정하고, 아래 매트릭스에서 유효한 결과가 없는 검사만 실행 대상으로 남긴다.

## 검증 매트릭스

| 변경                        | 우선 검증                                                    | 확장 조건                                       |
| --------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| 문서·agent                  | 링크/경로 확인, `yarn check:agent-docs`, `yarn format:check` | script·workflow 변경 시 해당 script 확인        |
| component·hook              | targeted Vitest, lint, typecheck                             | 상태·interaction 변경 시 수동 a11y 확인         |
| API·공통 utility            | targeted test, lint, typecheck                               | cache·contract 영향 시 `verify-api-integration` |
| design system public export | component test, `yarn check:generated`, typecheck            | story·consumer 영향 확인                        |
| route·build 설정            | lint, typecheck, 대상 app build                              | redirect·form·핵심 흐름이면 E2E 검토            |
| GitHub workflow             | static path/script 확인                                      | `verify-github-workflows`                       |

## 실행 순서

1. `git diff --check` 또는 파일 공백·merge marker 확인을 실행할 수 있으면 먼저 한다.
2. formatting, 생성물·경계 검사, targeted test처럼 빠른 check를 실행한다.
3. lint, typecheck, package/app build를 필요한 workspace 범위로 확장한다.
4. route·사용자 흐름·browser 설정이 바뀐 경우 수동 UI 또는 Playwright E2E를 선택한다.
5. 전체 영향이 크거나 release 전 요청된 경우에만 `yarn verify`를 실행한다.
6. 인계나 release 전에 메인 세션이 실행 근거를 함께 전달해 `bunch-verifier`를 호출한다. verifier는 근거의 유효성과 공백을 독립 확인하며, 같은 검사를 일괄 재실행하지 않는다.

## 실패와 미실행 처리

- 실패는 command, 핵심 error, 영향 범위, 재현 가능성, 다음 조치를 분리해 기록한다.
- 환경·credential·backend·browser 설치 때문에 실행하지 못한 것은 `미실행`으로 기록하고 성공으로 치환하지 않는다.
- 수정 권한이 없는 검증 작업에서는 원인을 보고하고 임의 수정하지 않는다.

## 출력

| 검증 | 상태 | 실행 근거 또는 미실행 이유 |
| ---- | ---- | -------------------------- |

새 실행·도구 캐시 적중·이전 결과 재사용을 구분한다. 재실행한 검사는 이유를 적는다.

그 뒤에 수동 확인 항목, 남은 리스크, 후속 실행이 필요한 조건을 적는다. commit, push, PR 생성은 하지 않는다.

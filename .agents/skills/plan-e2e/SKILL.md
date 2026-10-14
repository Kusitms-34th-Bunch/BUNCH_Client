---
name: plan-e2e
description: 이 monorepo의 사용자 핵심 흐름을 위한 집중 Playwright E2E 범위를 설계하거나 구현한다. route, 인증, form 제출, 여러 화면 흐름의 E2E에 사용한다.
---

# E2E 범위 설계

## 시작 조건

`docs/workflows/e2e-testing.md`, `docs/workflows/testing.md`, `e2e/`, Playwright config, 대상 route와 scripts를 읽는다.
unit/component test로 증명하기 어려운 navigation, route guard, 인증, mutation 후 이동을 대상으로 삼는다.

## 시나리오 설계

1. 사용자 목표 하나와 happy path 하나를 먼저 정한다.
2. 인증, seed, API stub, cleanup, 외부 dependency의 전제를 명시한다.
3. action마다 URL, role, label, text, visible state 같은 사용자 관찰 assertion을 둔다.
4. 필요할 때만 하나의 고위험 failure·권한 분기를 더한다.
5. spec·user flow·critical assertion·의도적 제외 범위를 coverage 표에 기록한다.

## 안정성 규칙

- locator는 role → label → text → testid → CSS 순서로 사용한다.
- auto-wait와 `expect`를 사용하며 sleep·무조건 retry 증가로 flaky를 숨기지 않는다.
- browser·port·base URL은 root Playwright config와 app script에 맞춘다.
- screenshot 비교는 viewport, browser, font, data, animation을 통제할 수 있을 때만 도입한다.

## 완료 기준

실행 command, 환경 전제, 성공 assertion, 제외한 흐름, artifact·flaky 위험을 함께 보고한다. 존재하지 않는 backend fixture·운영 credential을 가정하지 않는다.

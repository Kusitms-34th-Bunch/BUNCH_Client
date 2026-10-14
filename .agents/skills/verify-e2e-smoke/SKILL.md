---
name: verify-e2e-smoke
description: 저장소의 집중 Playwright smoke coverage, script, 앱 port, CI 정렬을 검증한다. E2E 설정, smoke spec, app startup 관련 변경에 사용한다.
---

# E2E Smoke 검증

## 먼저 확인

- `docs/workflows/e2e-testing.md`, Playwright config, `e2e/`, root scripts, 대상 app dev/build script를 읽는다.
- smoke가 보호할 route와 가장 작은 사용자 성공 기준을 명확히 한다.

## 감사 항목

1. web server command·port·base URL이 local과 CI에서 일관되는지 확인한다.
2. spec이 독립 실행 가능하고 외부 서비스·개인 credential·고정 시간에 불필요하게 의존하지 않는지 확인한다.
3. selector가 role·label·visible text 중심이고 실패 artifact가 남는지 확인한다.
4. 사용자 관찰 핵심 경로, redirect·error 같은 필요한 분기, cleanup 전략이 범위에 맞는지 확인한다.

## 출력

- smoke 대상, 실행 명령·결과, 환경 전제, flaky 위험과 보완안을 적는다.
- CI 또는 browser 설치를 임의로 변경·실행하지 않는다.

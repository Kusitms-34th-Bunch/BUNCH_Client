# E2E Testing

Playwright는 재사용 package가 아니라 repository test harness로 `e2e/`에서 관리한다.

## Current coverage

| Surface | Project          | Spec location         | Current scope                |
| ------- | ---------------- | --------------------- | ---------------------------- |
| admin   | `admin-chromium` | `e2e/admin/*.spec.ts` | root route smoke             |
| web     | —                | `e2e/web/`            | product route가 생긴 뒤 추가 |

## Commands

```bash
yarn e2e:install
yarn e2e:typecheck
yarn e2e
yarn e2e:ui
yarn e2e:report
```

GitHub Actions에서도 browser 설치 전에 `yarn e2e:typecheck`를 실행한 뒤 Playwright를 실행한다.

`playwright.config.ts`가 admin dev server를 `127.0.0.1:5173`에서 시작하거나 재사용한다. `--strictPort`로 포트 fallback을 막아, 다른 프로세스가 이미 그 포트를 쓰고 있으면 조용히 다른 포트로 옮겨가 엉뚱한 인스턴스를 테스트하는 대신 즉시 실패하게 한다.

## Writing tests

- locator는 `getByRole`, `getByLabel`, `getByText`, `getByTestId` 순으로 사용한다.
- `data-testid`는 접근 가능한 이름이나 role로 안정적으로 찾을 수 없을 때만 추가한다.
- route guard, navigation, API cache와 mutation 이후 이동처럼 단위 테스트로 증명하기 어려운 핵심 흐름을 우선한다.
- 임의의 sleep이나 retry 증가로 flaky test를 숨기지 않는다. selector, server startup, 비동기 상태 중 원인을 먼저 분류한다.
- 앱 WebView의 iOS 엔진은 WebKit이다. web E2E를 추가할 때는 Chromium 외에 WebKit 모바일 project를 포함할지 검토한다. 특정 브라우저에서만 실패하면 flaky로 단정하지 않고 trace의 스크린샷과 page snapshot부터 확인한다. 다른 프로젝트에서는 mutation 직후 navigate의 cache 레이스가 WebKit에서만 재현됐고, timeout을 늘려서는 풀리지 않았다(`docs/architecture/data-layer.md`).
- 인증이 필요 없는 핵심 화면에는 `@axe-core/playwright` 같은 자동 접근성 검사를 smoke에 더할 수 있다. critical·serious 위반 0을 기준으로 삼되, 자동 검사는 수동 접근성 확인을 대체하지 않는다.
- Playwright의 auto-wait와 `expect`의 관찰 조건을 사용하고, 고정 시간 대기는 추가하지 않는다.
- test data, 인증, 외부 API, cleanup 방식이 필요한 흐름은 spec의 전제로 명시한다. 개인 credential이나 실제 운영 데이터를 사용하지 않는다.

## Coverage 기록

핵심 흐름이 생기면 spec마다 아래를 기록한다.

| Spec | 사용자 흐름 | 핵심 assertion | 의도적으로 제외한 범위 |
| ---- | ----------- | -------------- | ---------------------- |

- 화면 간 navigation, route guard, mutation 후 이동처럼 unit test로 증명하기 어려운 흐름을 우선한다.
- screenshot 기반 검증을 추가할 때는 browser·viewport·font·data·animation을 고정할 수 있을 때만 사용한다. 기준 이미지 갱신 절차와 안정화 근거를 함께 남긴다.

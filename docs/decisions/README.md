# Decisions

구조, 라이브러리, workspace 경계, 데이터 처리처럼 이후 작업의 선택을 제한하는 결정만 기록한다.

- 단순 구현, 오타, 일회성 UI 조정은 기록하지 않는다.
- `records/NNN-short-title.md` 형식으로 새 파일을 만든다.
- 배경, 결정, 대안, 결과, 검증 또는 후속 작업을 적는다.
- 어떤 조건이 생기면 이 결정을 다시 검토할지 함께 적는다. 현재 선택을 영구 규칙처럼 취급하지 않는다.
- 기록 전에 셋 다 맞는지 본다. 이후 여러 작업에 영향을 주는가, 합리적인 대안 사이에서 고른 것인가, 바꾸려면 여러 파일·사용처를 함께 검토해야 하는가.
- 문서 맨 위에 상태(`proposed`, `accepted`, `superseded`, `rejected`)를 적는다. `accepted`는 결정됐다는 뜻이지 구현됐다는 뜻이 아니므로, 코드에 아직 없으면 `구현 상태(YYYY-MM-DD 확인): 미구현`과 후속 작업 위치를 함께 적는다.
- 결정이 바뀌면 기존 기록을 지우지 않는다. 옛 기록은 `superseded`로 바꾸고 대체 기록을 링크한 뒤, 새 기록에 무엇이 왜 바뀌었는지 적는다.

## 현재 결정

- [001: 빌드타임 모노레포 통합 유지](./records/001-build-time-integration.md)
- [002: Yarn PnP workspace 설치 방식 유지](./records/002-yarn-pnp-workspace-installation.md)
- [003: apps/mobile-shell은 Yarn PnP 예외로 pnpm을 쓴다](./records/003-mobile-shell-pnpm-exception.md)
- [004: apps/admin은 scaffold로 유지하고 기능 개발은 보류한다](./records/004-admin-deferred.md)
- [005: 작업은 develop으로 모으고 main은 프로덕션용으로 둔다](./records/005-branch-strategy.md)
- [006: 웹 오류 수집에 Sentry를 사용한다](./records/006-web-sentry-error-monitoring.md)

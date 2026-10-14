# Bridge Workspace

Root `AGENTS.md`와 `docs/architecture/mobile-shell.md`를 먼저 따른다. 이 패키지는 `apps/web`과 `apps/mobile-shell` 사이의 타입 계약만 소유한다.

- 런타임 구현을 두지 않는다. zod schema와 TypeScript 타입(`AppBridge`)만 export한다.
- React Native 전용 또는 브라우저 전용 의존성을 추가하지 않는다 — 양쪽 모두에서 import 가능해야 한다.
- 이 패키지는 Yarn workspace 멤버다. `apps/mobile-shell`은 Yarn workspace 밖에 있어 `file:../../packages/bridge`로 참조한다 — 이 패키지를 수정하면 `apps/mobile-shell`에서 `pnpm install`을 다시 실행해야 반영된다.
- 새 네이티브 메서드를 추가하면 여기(계약)와 `apps/mobile-shell`(구현)을 같은 변경에서 함께 갱신한다.
- 검증은 `yarn workspace @app/bridge typecheck`, `lint`를 선택한다.

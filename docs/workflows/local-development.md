# Local Development

## Runtime

- Node.js: root `package.json`의 `engines`
- Package manager: root `package.json`의 `packageManager`에 명시된 Yarn 4 PnP
- Task runner: `turbo.json`

의존성 또는 `yarn.lock`을 바꾼 뒤에는 `yarn install`을 명시적으로 실행한다.

## Environment variables

- 예시 파일은 `apps/web/.env.example`, `apps/admin/.env.example`에만 커밋하고 실제 `.env*` 값은 커밋하지 않는다.
- Next.js는 `NEXT_PUBLIC_*`, Vite는 `VITE_*`만 browser bundle에 노출한다. 비밀값은 이 접두사를 사용하지 않는다.
- 각 앱의 `build` task는 해당 앱의 `.env*` 변경을 Turbo cache input으로 포함한다.

## Applications

| Workspace    | Dev command                     | Port              |
| ------------ | ------------------------------- | ----------------- |
| `@app/web`   | `yarn workspace @app/web dev`   | Next default port |
| `@app/admin` | `yarn workspace @app/admin dev` | `5173`            |

admin은 Vite `strictPort`를 사용한다. E2E는 같은 `5173` 포트를 사용한다.

## Targeted verification

- `apps/web/**`: `yarn workspace @app/web lint`, `typecheck`, `test`, 필요 시 `build`
- `apps/admin/**`: `yarn workspace @app/admin lint`, `typecheck`, `test`, 필요 시 `build`
- `packages/design-system/**`: `lint`, `typecheck`, `test`, 필요 시 `build-storybook`
- `turbo/generators/**`: `yarn gen:ds-component`의 sample 생성 또는 관련 generator check, `yarn check:generated`, `yarn format:check`
- `e2e/**`: `yarn e2e:typecheck`, `yarn e2e`
- 문서·agent 구조: `yarn check:agent-docs`, `yarn format:check`

변경 범위가 넓거나 PR 전 전체 확인이 필요하면 `yarn verify`를 사용한다. 최종 보고에는 실제 실행한 명령만 적는다.

UI 변경은 가능한 경우 해당 app을 실행해 keyboard, focus, loading·error·empty 상태와 좁은 viewport·긴 텍스트를 수동 확인한다. screenshot은 시각 회귀를 보조할 수 있지만 동작 검증을 대신하지 않는다. agent가 브라우저를 직접 열어 확인하려면 `docs/agent/agent-browser-mcp.md`를 확인한다.

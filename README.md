# BUNCH

Yarn 4 PnP와 Turborepo 기반의 frontend monorepo다. 현재는 web·admin 앱과 공용 package를 위한 개발 기반만 구성되어 있으며, 제품 도메인과 기능 명세는 확정된 뒤 추가한다.

## Workspace

| 경로                     | 역할                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| `apps/web`               | Next.js App Router 사용자 웹                                                   |
| `apps/admin`             | Vite + TanStack Router 관리자 앱. scaffold만 존재, 실제 기능은 의도적으로 보류 |
| `apps/mobile-shell`      | Expo 네이티브 쉘(WebView). Yarn workspace 밖, pnpm 전용                        |
| `packages/api-core`      | 공통 HTTP transport와 API 계약                                                 |
| `packages/design-system` | 공용 React UI                                                                  |
| `packages/bridge`        | web↔mobile-shell 타입 계약                                                     |
| `packages/lint-config`   | 공용 ESLint 설정                                                               |
| `packages/ts-config`     | 공용 TypeScript 설정                                                           |
| `e2e`                    | Playwright E2E                                                                 |
| `turbo/generators`       | 반복 scaffold 생성기                                                           |

## Getting started

```sh
yarn install
yarn dev
```

기본 `yarn dev`는 web 앱을 실행한다. 다른 앱은 workspace 명령으로 실행한다.

```sh
yarn workspace @app/web dev
yarn workspace @app/admin dev
```

`apps/mobile-shell`은 Yarn workspace 밖에 있다. 그 폴더 안에서 pnpm으로 따로 실행한다.

```sh
cd apps/mobile-shell
pnpm install
pnpm start
```

## Web error monitoring

웹은 Sentry로 production 오류를 수집한다. `apps/web/.env.example`의 DSN과 배포 변수를 설정한다. 수집 범위·개인정보 정책·source map 업로드 조건은 [Sentry 도입 결정](./docs/decisions/records/006-web-sentry-error-monitoring.md)을 따른다.

## Commands

```sh
yarn lint
yarn typecheck
yarn test
yarn build
yarn verify
```

## Documentation

- 문서 시작점: [docs/index.md](./docs/index.md)
- 기능 spec 작성 기준: [docs/workflows/spec-writing.md](./docs/workflows/spec-writing.md)
- agent 문서 라우팅: [AGENTS.md](./AGENTS.md)
- semantic code navigation이 필요하면 Serena MCP를 선택적으로 쓸 수 있다: [docs/agent/serena-mcp.md](./docs/agent/serena-mcp.md)

제품·도메인 내용은 확정된 기능의 owner 폴더 가까이에 `*.spec.md`로 기록한다. 장기 결정과 반복 장애는 각각 `docs/decisions/records/`, `docs/troubleshooting/records/`에 남긴다.

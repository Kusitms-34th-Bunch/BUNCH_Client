# BUNCH

Next.js 사용자 웹, 관리자 앱, Expo WebView 네이티브 쉘을 관리하는 frontend monorepo다. Yarn 4 PnP와 Turborepo를 사용한다.

## Workspace

| 경로                     | 역할                                  |
| ------------------------ | ------------------------------------- |
| `apps/web`               | Next.js App Router 사용자 웹          |
| `apps/admin`             | Vite + TanStack Router 관리자 앱      |
| `apps/mobile-shell`      | Expo WebView 네이티브 쉘              |
| `packages/api-core`      | 공통 HTTP transport와 API 계약        |
| `packages/design-system` | 공용 React UI, 디자인 토큰, Storybook |
| `packages/bridge`        | web↔mobile-shell 타입 계약            |
| `packages/lint-config`   | 공용 ESLint 설정                      |
| `packages/ts-config`     | 공용 TypeScript 설정                  |
| `e2e`                    | Playwright E2E                        |
| `turbo/generators`       | 반복 scaffold 생성기                  |

## Getting started

Node.js 24와 Yarn 4를 사용한다. 환경 변수는 각 앱의 `.env.example`을 참고해 `.env.local`에 설정한다.

```sh
yarn install --immutable
yarn dev
```

`yarn dev`는 웹을 실행한다. 관리자 앱은 `yarn workspace @app/admin dev`로 실행한다.

모바일 쉘은 Yarn workspace 밖에서 pnpm으로 실행한다.
시뮬레이터·실기기 설치와 실행 순서는 [모바일 앱 실행과 테스트](./docs/workflows/mobile-testing.md)를 따른다.
WebView와 bridge 구성은 [모바일 쉘 구조](./docs/architecture/mobile-shell.md)를 참고한다.

## Commands

| 명령                                      | 역할                                             |
| ----------------------------------------- | ------------------------------------------------ |
| `yarn verify`                             | 생성물·문서·경계·포맷·lint·타입·테스트·빌드 검증 |
| `yarn e2e:install` / `yarn e2e`           | E2E 브라우저 설치 및 테스트                      |
| `yarn storybook`                          | 공용 UI 개발 환경 실행                           |
| `yarn tokens:build` / `yarn tokens:check` | 디자인 토큰 CSS 생성 및 동기화 검사              |

## Documentation

- [문서 시작점](./docs/index.md)
- [기능 spec 작성](./docs/workflows/spec-writing.md)
- [스타일과 디자인 토큰](./docs/architecture/styling-and-tokens.md)
- [오류 수집](./docs/decisions/records/006-web-sentry-error-monitoring.md)
- [Git 작업 흐름](./docs/conventions/git.md) · [CI](./docs/workflows/ci.md)
- [변경 범위별 검증](./docs/workflows/verification.md)
- [Agent 문서 라우팅](./AGENTS.md)

## License

Copyright (c) 2026 BUNCH. All rights reserved.

이 저장소는 열람만 허용하며, 코드와 디자인 자산의 복제·수정·배포·재사용을 허용하지 않는다.

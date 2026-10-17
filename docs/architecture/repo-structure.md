# Repository Structure

```text
apps/
  web/                  Next.js App Router application
  admin/                Vite + TanStack Router application
  mobile-shell/         Expo native shell (WebView wrapping apps/web), outside the Yarn workspace — pnpm only
packages/
  api-core/             transport and shared API contracts
  design-system/        Figma UI 컴포넌트와 token
  bridge/               web<->mobile-shell typed contract only (no runtime)
  lint-config/          shared ESLint configuration
  ts-config/            shared TypeScript configuration
e2e/                    repository Playwright harness
turbo/generators/       Turbo generator definitions
docs/                   human-readable source of truth
.agents/                execution guides, flows, skills, scripts, templates
```

- `apps/*`는 독립 배포 단위이며 다른 app을 import하지 않는다.
- `packages/*`는 app에서 소비할 수 있지만 app 코드에 의존하지 않는다.
- 새 코드는 먼저 owning app 또는 package에 둔다. UI 컴포넌트는 예외로, Figma에 컴포넌트로 정의된 것은 사용처 수와 관계없이 처음부터 design system에 둔다(`docs/architecture/design-system-components.md`의 배치 기준). 그 외 코드는 실제 재사용이 확인된 뒤에만 shared package로 승격한다.
- 새 app, package, root script, generator, 경계를 바꾸면 `docs/index.md`, `AGENTS.md`, 관련 architecture·workflow 문서를 함께 갱신한다.
- `apps/mobile-shell`은 root `package.json`의 `workspaces`에서 제외된 유일한 app이다. Yarn install·workspace 명령의 대상이 아니며, 설치는 그 폴더 안에서 pnpm으로 따로 한다 — `docs/architecture/mobile-shell.md`를 확인한다.
- 기능 spec은 해당 app 또는 domain owner 가까이에 `*.spec.md`로 두고, 공통 제품 기준으로 확정된 뒤에만 `docs/`로 승격한다.

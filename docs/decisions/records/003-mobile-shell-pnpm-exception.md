# 003: apps/mobile-shell은 Yarn PnP 예외로 pnpm을 쓴다

- 상태: accepted

## 배경

`docs/decisions/records/002-yarn-pnp-workspace-installation.md`는 Yarn 4 PnP를 이 저장소의 유일한 설치 방식으로 유지하기로 했고, 재검토 조건으로 "새로 도입할 필수 도구가 PnP를 지원하지 않아 유지 비용이 명확히 커질 때"를 명시했다.

Expo/React Native의 Metro 번들러는 Yarn PnP의 모듈 해석 방식을 지원하지 않는다(설정으로 우회 가능한 경고가 아니라 구조적 비호환). `apps/web`을 감싸는 네이티브 쉘을 Expo로 만들기로 하면서 이 조건에 해당하게 됐다.

## 결정

`apps/mobile-shell`만 pnpm을 쓰는 예외로 둔다. 저장소의 나머지(`apps/web`, `apps/admin`, `packages/*`)는 Yarn PnP를 그대로 유지한다 — 결정 002는 철회하지 않는다.

- root `package.json`의 `workspaces`에서 `apps/mobile-shell`을 `!apps/mobile-shell`로 명시 제외한다. Yarn의 workspace 그래프에 포함되지 않는다.
- `apps/mobile-shell`은 자체 `package.json`과 `pnpm-lock.yaml`로 완전히 독립된 설치 단위다. `pnpm@11.24.0`을 고정한다(2026년 10월 기준 안정 버전 계열. pnpm 12는 Rust로 재작성된 최신 메이저라 Expo/Metro 생태계 검증이 더 쌓인 뒤 올린다).
- `packages/bridge`(web↔native 타입 계약)는 Yarn workspace 멤버로 유지하고, `apps/mobile-shell`에서는 `"@app/bridge": "file:../../packages/bridge"`로 상대 경로 참조한다.

## 검토한 대안

- **저장소 전체를 `nodeLinker: node-modules`로 전환**: Expo 호환되지만 `.yarn/sdks`, editor 연동을 다시 세팅해야 하고 결정 002의 PnP 경계를 저장소 전체에서 포기하게 된다. `apps/mobile-shell` 하나 때문에 전체를 바꾸는 건 과하다.
- **전체를 pnpm으로 마이그레이션**: Expo 기반 모바일 쉘을 쓰는 다른 pnpm 단일 모노레포와 같은 조합이 되지만 lockfile·CI·editor 설정을 다 바꾸는 가장 큰 migration이다. 지금 범위에서 이득 대비 비용이 크다.
- **`apps/mobile-shell`을 아예 별도 저장소로 분리**: 패키지 매니저 충돌은 사라지지만 `packages/bridge` 공유가 npm 배포나 git submodule처럼 더 무거운 방식이 필요해진다. 지금은 한 저장소 안에 두는 게 가볍다.

## 영향

- `apps/mobile-shell` 설치·빌드는 그 폴더 안에서 `pnpm install`로 한다. root `yarn install`은 이 워크스페이스를 건드리지 않는다.
- `apps/mobile-shell`에 네이티브 모듈을 추가할 때는 `pnpm add`가 아니라 `npx expo install <package>`를 쓴다.
- `.claude/hooks/guard-rules.mjs`의 "Yarn만 쓴다" 차단 규칙은 명령어에 `apps/mobile-shell` 경로가 포함된 경우에만 pnpm·npx를 예외로 허용한다.
- `packages/bridge`를 수정하면 `apps/mobile-shell`에서 `pnpm install`을 다시 실행해 `file:` 참조를 갱신해야 한다 — 자동으로 반영되지 않는다.
- `.agents/scripts/check-agent-docs.mjs`의 workspace 목록에 `packages/bridge`를 추가했다(Yarn workspace 멤버이므로). `apps/mobile-shell`은 Yarn workspace가 아니라서 이 목록에 넣지 않았다.

## 검증 / 후속 작업

- `apps/mobile-shell`과 `packages/bridge` 양쪽에서 bridge 계약을 바꾸면 양쪽 typecheck(`pnpm exec tsc --noEmit`, `yarn workspace @app/bridge typecheck`)를 모두 실행한다.
- Expo SDK를 올릴 때 pnpm 버전 호환성을 함께 확인한다.

## 재검토 조건

- Expo/Metro가 Yarn PnP를 공식 지원하게 될 때 — 그러면 `apps/mobile-shell`을 다시 Yarn workspace로 합칠지 검토한다.
- 네이티브 쉘이 더 늘어나(iOS/Android 외 다른 타깃 등) pnpm 예외 관리 비용이 커질 때 — 그때는 저장소 전체 pnpm 전환을 재검토한다.
- `apps/mobile-shell`의 WebView 성능·제스처 체감이 실제로 문제가 되어 일부 화면을 완전 네이티브로 옮기게 될 때 — 그 화면의 패키지 매니저·빌드 경계를 다시 설계한다.

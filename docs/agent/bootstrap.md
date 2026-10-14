# Agent Bootstrap

이 문서는 Claude Code와 Codex가 작업 전에 필요한 프로젝트 문서를 선택하는 기준이다. 전체 agent 활용 흐름을 처음 파악하려면 `docs/agent/overview.md`를 먼저 읽는다.

## 부트 순서

1. root `AGENTS.md`를 읽고, 작업 workspace에 `AGENTS.md`가 있으면 추가로 읽는다. Claude Code에서는 같은 위치의 `CLAUDE.md`가 각각의 `AGENTS.md`를 연결한다.
2. 이 bootstrap 문서를 읽는다.
3. 코드 변경·리뷰·리팩터링일 때만 Tier 1을 읽는다.
4. 작업 성격이 분명해지면 Tier 2와 surface reference를 필요한 만큼만 읽는다.

## Tier 1: 기본 로드

| 문서                                     | 목적                           |
| ---------------------------------------- | ------------------------------ |
| `docs/workflows/development.md`          | inspect-edit-verify 작업 흐름  |
| `docs/conventions/package-management.md` | Yarn PnP·workspace·패키지 경계 |
| `docs/workflows/verification.md`         | 변경 범위별 검증 선택          |

## Tier 2: 필요 시 로드

| 작업                                        | 문서                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| 폴더 배치, import, 공유 범위 판단           | `docs/architecture/app-structure.md`                                        |
| package 추가·workspace 경계·Turbo generator | `docs/architecture/repo-structure.md`, `turbo.json`                         |
| 새 도메인·기능의 구현 범위 정리             | `docs/workflows/feature-intake.md`, `docs/architecture/domain-ownership.md` |
| route·접근·redirect 판단                    | `docs/architecture/routing-and-access.md`                                   |
| React/TypeScript/스타일 작성                | `docs/conventions/coding.md`                                                |
| 코드 품질·리팩터링 판단                     | `docs/code-quality/`                                                        |
| hook 추출·구성                              | `docs/code-quality/component-logic.md`, `.agents/guides/hook.md`            |
| 보안 경계·취약점 검토                       | `docs/workflows/security-review.md`                                         |
| 컴포넌트 배치·API·접근성 판단               | `docs/architecture/components.md`                                           |
| 컴포넌트 조합 패턴 선택                     | `docs/architecture/component-patterns.md`                                   |
| 폼·포커스·터치·i18n·hydration 세부 기준     | `docs/architecture/web-interface-guidelines.md`                             |
| 애니메이션·전환 추가                        | `docs/architecture/motion.md`                                               |
| API, TanStack Query, 서버·브라우저 경계     | `docs/architecture/data-layer.md`, `docs/workflows/api-integration.md`      |
| 테스트 작성·수정                            | `docs/workflows/testing.md`                                                 |
| 커밋 또는 PR 문구                           | `docs/conventions/commit.md`                                                |
| 문서·이슈·PR 본문·분석 보고 작성            | `docs/conventions/writing.md`                                               |
| PR 리뷰·inline comment 게시                 | `docs/workflows/pr-review.md`                                               |
| 이슈·브랜치·PR 라벨 자동화                  | `docs/conventions/git.md`                                                   |
| CI 파이프라인·workflow 실패 대응            | `docs/workflows/ci.md`                                                      |
| 디자인 시스템 컴포넌트                      | `docs/architecture/design-system-components.md`                             |
| 아이콘 생성 파이프라인(비활성)              | `docs/architecture/design-system-icons.md`                                  |
| 네이티브 쉘·web↔native bridge               | `docs/architecture/mobile-shell.md`                                         |
| Tailwind·token·스타일 책임                  | `docs/architecture/styling-and-tokens.md`                                   |
| 성능·번들·리렌더 이슈                       | `docs/workflows/performance.md`                                             |
| web 공개 페이지 metadata·색인               | `docs/workflows/seo.md`                                                     |
| 페이지·API·디자인 시스템 작업 순서          | `.agents/guides/`의 해당 guide                                              |
| 구현 전·후 흐름                             | `.agents/flows/`의 해당 flow                                                |
| 장기적으로 방향을 제한하는 결정             | `docs/decisions/README.md`                                                  |
| 재현 가능한 반복 장애                       | `docs/troubleshooting/README.md`                                            |
| symbol·reference 탐색, Serena MCP 설정      | `docs/agent/serena-mcp.md`                                                  |
| agent가 직접 브라우저로 UI 확인             | `docs/agent/agent-browser-mcp.md`                                           |

## Surface reference

작업 대상 앱 또는 패키지의 `package.json`, `tsconfig.json`, 코드 구조를 먼저 확인한다. 설치되지 않은 라이브러리나 예정 구조를 현재 기준으로 가정하지 않는다. 각 app·package의 `AGENTS.md`는 부트 순서 1단계에서 이미 읽으므로 아래 목록에 다시 나열하지 않는다.

- web: Next.js App Router와 `src/app`, `src/features`, `src/shared`
- admin: TanStack Router와 `src/routes`, `src/pages`, `src/features`, `src/api`
- design system: `packages/design-system/src`, Storybook, 공개 export
- api core: `packages/api-core/src`와 호출 앱의 API 경계
- mobile shell: `apps/mobile-shell/App.tsx`, Yarn workspace 밖(pnpm 별도 설치)
- bridge: `packages/bridge/src`, web↔mobile-shell 타입 계약만 소유

## 읽기 범위

- 단순 질문에는 `AGENTS.md`와 이 bootstrap 문서만으로 답한다.
- 구현·리뷰·리팩터링은 Tier 1과 작업 유형에 맞는 Tier 2, 대상 surface만 읽는다.
- 작업 도메인이 정해진 뒤에는 해당 domain, feature, route 가까이의 코드·spec·test를 우선 확인한다. 관련 없는 문서를 한꺼번에 읽어 추측으로 연결하지 않는다.
- 아직 도입되지 않은 앱, 도메인, 라이브러리를 위한 reference는 미리 만들지 않는다. 반복되는 실제 맥락이 생길 때 추가한다.

## 전용 에이전트

전용 agent는 읽기 전용 조사·리뷰·검증 역할이다. 일반 구현은 메인 세션이 담당한다.

| 역할                      | 공통 기준                                       |
| ------------------------- | ----------------------------------------------- |
| reviewer                  | `docs/agent/roles/reviewer.md`                  |
| verifier                  | `docs/agent/roles/verifier.md`                  |
| debugger                  | `docs/agent/roles/debugger.md`                  |
| api-contract-reviewer     | `docs/agent/roles/api-contract-reviewer.md`     |
| ui-accessibility-reviewer | `docs/agent/roles/ui-accessibility-reviewer.md` |
| route-reviewer            | `docs/agent/roles/route-reviewer.md`            |
| e2e-planner               | `docs/agent/roles/e2e-planner.md`               |

Claude Code와 Codex의 adapter는 각각 `.claude/agents/`, `.codex/agents/`에 둔다.

### 공통 계약

- 메인 세션이 변경 범위, 확인할 사용자 결과, 근거(Figma node·자료·명령)를 정해 넘긴다. 전용 agent는 자기 role 문서와 필요한 규칙만 읽는다.
- 결과는 확인 범위, 발견 사항, 근거, 미검증 공백 순으로 돌려준다. 코드·실행 결과에서 직접 확인한 것과 추론을 구분한다.
- 판정에 필요한 입력(Figma 화면, 렌더 결과, 권한, 재현 입력)이 없으면 통과로 쓰지 않고 `BLOCKED`나 검증 공백으로 남긴다. 코드만 읽은 결과는 시각 검증을 대체하지 않는다.
- 수정, 재검증, 최종 결론은 메인 세션만 책임진다.
- 실제로 호출했을 때만 호출했다고 쓴다. Codex의 전용 agent는 role 문서를 재사용할 뿐 Claude 모델 프로세스가 아니다.

### 필수 호출 기준

아래 표에 해당하는 변경이면, 완료를 보고하기 전에 메인 세션이 해당 role을 최소 한 번 호출한다. 사용자가 실시간으로 결과를 확인해준 것은 이 호출을 대체하지 않는다 — 사용자 피드백은 의도한 대로 나왔는지 확인하는 것이고, 전용 agent는 문서화된 규칙만으로 회귀·경계·계약 위반을 독립적으로 다시 보는 것이라 목적이 다르다.

| 작업 유형                       | 필수 호출                 |
| ------------------------------- | ------------------------- |
| route·layout·접근 조건 변경     | route-reviewer            |
| API 계약·query·mutation 변경    | api-contract-reviewer     |
| UI·Figma 구현, 접근성 관련 변경 | ui-accessibility-reviewer |

단순 오탈자 수정, 문서 전용 변경, 한 파일의 사소한 조정에는 이 표를 적용하지 않는다. 이 표와 별개로 `prepare-commit`(코드 변경 커밋)과 `prepare-pull-request`(PR)는 계획·초안을 내기 전에 `bunch-reviewer`를 호출한다. 기준은 각 skill 문서를 따른다. debugger와 e2e-planner는 완료 게이트가 아니라 조사·설계가 필요한 시점에 그때그때 호출한다.

## Skills

| Skill                                                                                       | 용도                                |
| ------------------------------------------------------------------------------------------- | ----------------------------------- |
| `create-page-feature`, `implement-form-flow`                                                | page, route, form 구현              |
| `assess-api-contract`, `integrate-api`, `verify-api-integration`, `configure-openapi-types` | API 계약, query·mutation, 생성 타입 |
| `create-app-component`, `create-ds-component`, `implement-from-figma`                       | 앱 공용·디자인 시스템·Figma UI 구현 |
| `create-generator`                                                                          | Turbo generator와 scaffold 변경     |
| `gen-tests`, `plan-e2e`, `verify-e2e-smoke`, `verify-changes`                               | test, E2E, 변경 검증                |
| `review-changes`, `review-code-quality`                                                     | 전체 diff·코드 품질 리뷰            |
| `review-architecture`, `refactor-code`                                                      | 경계 판단·동작 보존 리팩터링        |
| `diagnose-performance`                                                                      | 측정 기반 성능 진단                 |
| `prepare-issue`, `prepare-commit`, `prepare-pull-request`                                   | 이슈·commit·PR 초안, 승인 시 실행   |
| `verify-github-workflows`, `verify-agent-docs`                                              | GitHub 자동화·agent harness 검증    |
| `verify-spec-sync`                                                                          | spec·구현·API 계약 동기화 점검      |
| `prepare-feature-scope`                                                                     | 기획·도메인·명세 구현 준비          |

모든 skill 원본은 `.agents/skills/{skill-name}/SKILL.md`에 있다. 스킬은 해당 문서와 가까운 기존 코드를 먼저 읽고, 설치되지 않은 도구나 아직 확정되지 않은 구조를 전제로 구현하지 않는다.

Claude Code는 `.claude/skills/{skill-name}`에 등록된 skill만 인식한다. `.claude/skills/{skill-name}`은 `.agents/skills/{skill-name}`을 가리키는 symlink adapter이며, 내용을 복제하지 않는다. Codex는 `AGENTS.md` 라우팅과 `.agents/skills/` 원본을 직접 읽으므로 별도 adapter가 필요 없다. 새 skill을 추가하면 두 위치 모두 갱신됐는지 `yarn check:agent-docs`로 확인한다.

## 문서 원칙

- `docs/`가 단일 source of truth다.
- guide와 flow는 실행 지침이며, 규칙을 중복 정의하지 않고 `docs/`의 해당 기준을 참조한다.
- 도구별 adapter는 공통 문서의 내용을 복제하지 않는다.
- workspace의 `CLAUDE.md`는 local `AGENTS.md`만 import한다. root `CLAUDE.md`와 상위 규칙은 Claude Code의 계층적 로드에 맡긴다.
- skill은 반복되는 실제 작업에만 추가하고, 일반 규칙은 `docs/`에 둔다.
- 반복되는 구조·라이브러리·운영 결정만 `docs/decisions/records/`에 기록한다.
- 단순 질문에는 Tier 1과 Tier 2를 불필요하게 전부 읽지 않는다.

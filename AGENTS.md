# AGENTS.md

이 파일은 상세 규칙을 직접 담는 문서가 아니라, Codex와 Claude Code가 프로젝트 문서를 찾기 위한 루트 라우팅 허브입니다.

## 저장소 정체

- Package manager: Yarn 4 PnP (`apps/mobile-shell`만 pnpm 예외, `docs/decisions/records/003-mobile-shell-pnpm-exception.md`)
- Apps: `apps/web` (Next.js App Router), `apps/admin` (Vite + TanStack Router), `apps/mobile-shell` (Expo 네이티브 쉘, Yarn workspace 밖)
- Shared packages: `packages/api-core`, `packages/design-system`, `packages/bridge` (web↔mobile-shell 타입 계약)
- Shared config: `packages/lint-config`, `packages/ts-config`
- Generator: `turbo/generators`

## 주요 명령

- `yarn dev`(web 개발 서버), `yarn build`, `yarn lint`, `yarn typecheck`, `yarn test`, `yarn format:check`
- `yarn verify`는 변조 가드·생성물·catalog·agent docs·boundaries 확인과 위 검증을 한 번에 실행합니다. 변경 범위별 선택 기준은 `docs/workflows/verification.md`를 확인합니다.
- `yarn check:agent-docs`는 agent 문서와 skill adapter의 동기화를 확인합니다. E2E는 `yarn e2e`입니다.

## 소통

- 별도 요청이 없으면 한국어로 생각하고 응답한다.
- 설명은 변경 결과, 검증 근거, 남은 제약 순으로 간결하게 전달한다. 문체는 `docs/conventions/writing.md`를 따른다.

## 작업 진행

요청의 성격을 먼저 판단한 뒤, 해당 작업에 연결된 문서와 실행 지침만 확인합니다. 구현 후에는 변경 범위에 맞는 검증을 수행하고, 결과와 남은 제약을 간단히 정리합니다.

## 문서 역할

- `docs/`는 사람이 읽는 단일 source of truth입니다.
- `.agents/`는 agent가 `docs/` 규칙을 실행하기 위한 flow, guide, skill, script, template을 둡니다.
- `.agents/`와 `docs/` 내용이 충돌하면 `docs/`를 먼저 갱신하고 `.agents/`는 실행 지침만 맞춥니다.

## 문서 라우팅

작업별로 읽을 문서와 skill은 아래 "작업 진입점"의 `docs/agent/bootstrap.md`가 canonical입니다. 여기에는 그 표에 없는 입구만 둡니다.

- 프로젝트 개요는 `README.md`, 명령은 `package.json`을 확인합니다.
- AI agent 활용 방법과 전체 흐름은 `docs/agent/overview.md`, 문서 선택 기준은 `docs/agent/bootstrap.md`, agent 문서·산출물·runtime state의 동기화와 승격 기준은 `docs/agent/maintenance.md`를 확인합니다.
- 문서는 `docs/architecture/`, `docs/conventions/`, `docs/workflows/`, `docs/code-quality/` 목적별로 둡니다.
- 기능 spec은 `docs/workflows/spec-writing.md`와 `.agents/templates/feature-spec.md`를 확인합니다.
- `.agents/`에는 flow(`flows/`), 구현 절차(`guides/`), repo-scoped skill 원본(`skills/`), 검증 스크립트·템플릿(`scripts/`, `templates/`)을 둡니다. Codex와 Claude Code adapter는 각 도구 설정에서 skill 원본을 참조합니다.
- project-scoped custom subagent 설정은 `.codex/agents/`, `.claude/agents/`에 둡니다.
- workspace 내부 작업은 해당 workspace의 `AGENTS.md`가 있으면 root 규칙 다음으로 확인합니다.

## 작업 진입점

작업 맥락별 확인 문서와 사용할 skill은 `docs/agent/bootstrap.md`의 Tier 2와 Skills 표를 canonical로 확인합니다. 이 표를 여기에 다시 나열하지 않습니다.

아직 라우팅 대상 파일이 없는 작업은 현재 코드와 저장소 설정을 먼저 확인하고, 가장 가까운 `docs/` 기준을 참고합니다.

## 작업 기준

- 문서가 비어 있으면 기존 코드와 현재 저장소 설정을 먼저 확인하고 추측하지 않습니다.
- Yarn 4 PnP만 사용하며 `npm`, `pnpm`, `npx`를 사용하지 않습니다.
- apps는 다른 app을 의존하지 않고, shared package는 app을 의존하지 않습니다.
- 새 규칙은 적절한 `docs/` 하위 문서에 추가하고 이 파일은 라우팅만 유지합니다.
- 기존 사용자 변경을 보존하고, 요청 범위 밖 변경을 되돌리지 않습니다.

## 문서 동기화

- 코드, 설정, 의존성, 스크립트, 폴더 구조, 아키텍처 경계를 변경하면 관련 문서를 함께 확인합니다.
- 설치되지 않은 도구나 예정 구조를 현재 기준으로 문서화하지 않습니다.
- 문서 변경이 필요 없다고 판단하면 final summary에 문서 영향이 없다고 명시합니다.

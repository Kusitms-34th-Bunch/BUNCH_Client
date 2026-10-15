# AI Agent 활용 가이드

이 문서는 팀원이 "우리가 Claude Code·Codex를 어떻게 쓰고 있는지" 전체 그림을 잡기 위한 안내다. 규칙 자체는 여기서 다시 설명하지 않는다 — 각 절은 실제 기준 문서로 바로 연결한다. 이 문서와 연결된 문서가 어긋나면 연결된 문서가 맞다.

## 왜 이렇게 나눴는가

- `docs/`는 사람이 읽는 단일 source of truth다. 코드·설정이 바뀌면 여기를 먼저 갱신한다.
- `.agents/`는 agent가 `docs/`의 규칙을 실행하기 위한 flow·guide·skill·script·template을 둔다. 규칙을 복제하지 않고 `docs/`를 참조만 한다.
- `.claude/`, `.codex/`는 각 도구의 adapter다. Claude Code와 Codex가 같은 저장소에서 같은 기준으로 동작하게 하되, 원본은 하나(`.agents/`)로 유지한다.
- 자세한 역할 표는 `AGENTS.md`의 "문서 역할"과 "문서 라우팅"을 확인한다.

## 작업이 시작될 때 벌어지는 일

1. agent가 root `AGENTS.md`를 읽는다(작업 workspace에 `AGENTS.md`가 따로 있으면 그것도 함께).
2. `docs/agent/bootstrap.md`를 읽고, 작업 성격에 따라 Tier 1(항상)과 Tier 2(필요한 것만)를 고른다.
3. 작업 대상 app·package의 실제 코드·설정(`package.json`, 기존 구현)을 확인한다 — 설치 안 된 라이브러리나 예정 구조를 가정하지 않는다.
4. 구현 후 변경 범위에 맞는 검증(`docs/workflows/verification.md`)을 실행하고, 필요하면 전용 agent를 호출한 뒤 결과를 보고한다.

이 순서와 각 Tier에 뭐가 들어있는지는 `docs/agent/bootstrap.md`가 기준이다.

## Skill: 반복 작업의 실행 표면

Skill은 "page 구현", "API 연동", "PR 준비"처럼 반복되는 작업 절차를 담는다. 어떤 작업에 어떤 skill을 쓰는지는 `AGENTS.md`의 "작업 진입점"과 `docs/agent/bootstrap.md`의 Skills 표가 기준이다.

사용자는 원하는 작업을 자연어로 요청하면 된다. agent가 bootstrap의 "요청에서 실행까지"에 따라 스킬을 선택하고 후속 구현·리뷰·검증을 이어간다. 키워드 추천은 보조 수단이며 질문을 실행 승인으로 바꾸지 않는다.

- 원본은 `.agents/skills/{name}/SKILL.md` 하나뿐이다.
- Claude Code는 `.claude/skills/{name}`(원본을 가리키는 symlink)으로만 skill을 인식한다.
- Codex는 `AGENTS.md` 라우팅과 `.agents/skills/` 원본을 직접 읽는다.
- 새 skill은 반복되는 실제 작업에서만 추가한다. 한 번 쓸 절차를 위해 skill을 만들지 않는다.

## 전용 agent: 읽기 전용 리뷰·검증

reviewer, verifier, debugger, api-contract-reviewer, ui-accessibility-reviewer, route-reviewer, e2e-planner는 조사·검토만 하고 파일을 고치지 않는다. 일반 구현은 메인 세션이 담당한다.

route·API 계약·UI 접근성에 영향을 주는 변경은 완료 보고 전에 해당 전용 agent를 **최소 한 번 호출해야 한다** — 사용자가 화면을 직접 확인해준 것으로는 대체되지 않는다. 정확한 호출 기준은 `docs/agent/bootstrap.md`의 "필수 호출 기준"을 확인한다.

## Hook: 자동으로 걸리는 안전장치

`.claude/hooks/`의 스크립트가 Claude Code·Codex 양쪽에 등록돼 있다(`.claude/settings.json`, `.codex/hooks.json`).

- **`guard-rules.mjs`**(PreToolUse): `console.log`, 명시적 `any`, `npm`/`pnpm`/`npx` 사용을 편집·커맨드 단계에서 차단한다. git 위험 명령(강제 푸시, `main` 직접 push, hook 우회, 전체 add, 되돌릴 수 없는 삭제)도 막는다(`docs/conventions/git.md`). 규칙을 바꾸면 `node --test .claude/hooks/guard-rules.test.mjs`로 확인한다.
- **`lint-check.mjs`**(PostToolUse): 수정한 파일 하나만 바로 eslint로 검사해 결과를 보여준다. 막지는 않는다.
- **`skill-suggest.mjs`**(UserPromptSubmit): 프롬프트에 Figma·디자인 구현·커밋·리뷰·리팩터링 같은 키워드가 있으면 관련 skill을 먼저 안내한다. 직접 실행하는 훅은 아니며, agent가 요청 의도를 확인해 해당 skill과 후속 지침을 읽고 적용한다. 감지 회귀 검증은 `node --test .claude/hooks/skill-suggest.test.mjs`로 실행한다.

hook을 새로 추가하는 기준(보편적 정책 + 안전 문제 + 반복된 miss 입증)은 `docs/agent/maintenance.md`를 따른다. **새 hook 이벤트를 등록한 직후에는 세션을 재시작해야 반영된다** — 같은 세션 안에서 바로 발화하지 않아도 설정이 잘못된 게 아니다.

## MCP 도구: 개인 선택

Serena(semantic code navigation)와 agent-browser(라이브 브라우저 조작)는 repo에 아무것도 커밋하지 않는 개인 로컬 도구다. 설치·등록 방법은 각각 `docs/agent/serena-mcp.md`, `docs/agent/agent-browser-mcp.md`를 확인한다. 쓰고 싶은 사람만 설치하면 되고, 안 써도 동작에 지장이 없다.

## future-skills: 아직 안 쓰는 참고 자료

`.agents/future-skills/`에는 지금 당장 쓰지 않지만 나중에 필요해질 가능성이 있는 서드파티 skill·라이브러리 lookup을 보관한다. 라우팅에 연결돼 있지 않아 agent가 평소엔 읽지 않는다 — 새 의존성이 필요할 때(`docs/conventions/package-management.md`) 또는 브리프 기반 신규 화면 생성처럼 지금 안 하는 작업이 실제로 필요해질 때 찾아본다. 활성화 절차는 `.agents/future-skills/README.md`에 있다.

## 문서를 최신으로 유지하기

- 코드·설정·의존성·폴더 구조가 바뀌면 같은 변경에서 관련 `docs/`를 함께 갱신한다(`AGENTS.md`의 "문서 동기화").
- agent 문서·adapter·skill 구조를 바꾸면 `yarn check:agent-docs`로 Claude·Codex adapter가 원본과 어긋나지 않았는지 확인한다.
- 반복되는 구조·라이브러리 결정은 `docs/decisions/`에, 재현되는 장애는 `docs/troubleshooting/`에 남긴다.
- 여러 도메인에 걸치거나 구현 위치가 아직 없는 spec은 `docs/specs/`에 둔다.

## 전체 문서 지도

모든 문서의 목록은 `docs/index.md`에 있다. 질문이 "지금 뭘 읽어야 하지"라면 `AGENTS.md`와 `docs/agent/bootstrap.md`부터 시작한다.

---
name: verify-agent-docs
description: 저장소 agent 문서 routing, repo-scoped skill, flow, Claude·Codex adapter를 검증한다. AGENTS.md, docs/agent, .agents, .claude, .codex 변경에 사용한다.
---

# Agent 문서 검증

## 목적

agent가 현재 저장소의 사실을 찾고 동일한 규칙을 Codex와 Claude에서 적용하도록 보장한다. 문서의 길이가 아니라 routing 정확성, source-of-truth, 실행 가능성을 검증한다.

## 확인 순서

1. `AGENTS.md` → `docs/agent/bootstrap.md` → `docs/agent/maintenance.md` → `.agents/README.md`의 역할 분리가 일관되는지 읽는다.
2. 변경된 docs, flow, guide, skill, script, template, `.claude/agents`, `.codex/agents`를 목록화한다.
3. 문서 링크와 script·package·workspace·skill 경로가 실제 존재하는지 확인한다.
4. `docs/`가 정책 source of truth이고 `.agents/`가 실행 지침인지, adapter가 공통 문서를 참조하는지 확인한다.
5. 같은 규칙이 여러 위치에 복제돼 drift를 만들지 않는지 확인한다.

## Skill 검토 기준

- frontmatter `name`, `description`과 폴더 이름이 맞는다.
- trigger 설명이 작업 범위를 충분히 구분한다.
- 사전 입력, 필요한 docs, 단계, 검증, 출력, 금지·중단 조건이 있다.
- 현재 Yarn 4 PnP, apps/web·admin, packages/api-core·design-system과 다른 project 전용 경로·명령을 넣지 않는다.
- 설치되지 않은 라이브러리·예정 구조를 `Current`로 쓰지 않는다.

## Adapter 검토 기준

- `CLAUDE.md`와 Claude adapter는 `AGENTS.md`, bootstrap 문서를 연결한다.
- Codex agent TOML은 역할 문서를 참조하며 project rule을 재정의하지 않는다.
- tool hook 또는 script는 secret를 출력·기록하지 않고 외부 mutation의 trigger를 명시한다.

## 검증과 출력

1. `yarn check:agent-docs`를 실행한다.
2. 변경 문서의 `yarn format:check`를 실행한다.
3. 필요 시 `rg`로 오래된 pnpm/npm·옛 app path·TODO template 잔재를 확인한다.

확인한 routing, command 결과, 끊어진 경로, 충돌·중복 규칙, 아직 실행하지 못한 adapter 검증을 분리해 보고한다.

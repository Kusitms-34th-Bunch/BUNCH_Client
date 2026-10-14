# Agent Maintenance

이 문서는 agent 문서와 실제 실행 표면이 어긋나지 않게 유지하는 기준이다.

## 기준의 우선순위

- 아키텍처·작업 규칙의 원본은 `docs/`다.
- `package.json` script, TypeScript·lint 설정, `.github/` workflow·template처럼 실제로 실행되거나 게시되는 산출물은 해당 동작의 가장 구체적인 기준이다.
- `.agents/`, `.claude/`, `.codex/`는 `docs/`와 실제 산출물을 실행에 연결하는 보조 표면이다. 충돌을 발견하면 실제 동작과 `docs/`를 먼저 맞추고 adapter·skill을 갱신한다.
- `.omx/`, `.omc/`, trace, 세션 state, 개인 전역 설정은 저장소 규칙이 아니며 commit하지 않는다.

## 변경 뒤 확인

- Node 기준은 `.nvmrc`, `package.json`의 `engines`, GitHub Actions의 `actions/setup-node`가 같은 major를 가리키는지 확인한다.
- workspace, script, package 이름, 문서 링크가 현재 구조를 가리키는지 확인한다.
- app·shared package의 경계가 달라지면 root와 해당 workspace의 `AGENTS.md`, architecture 문서를 함께 갱신할지 판단한다.
- workspace `AGENTS.md`를 추가하거나 변경하면 같은 위치의 `CLAUDE.md`가 local `AGENTS.md`만 import하는지 확인한다.
- agent 문서를 바꾼 뒤에는 `yarn check:agent-docs`와 `yarn format:check`를 실행한다.

## 자동화 승격

반복 실수는 처음부터 hook이나 CI로 고정하지 않는다.

1. 처음 발견한 항목은 관련 문서 또는 flow에 기록한다.
2. 같은 누락이 반복되면 guide 또는 skill의 명시적 단계로 만든다.
3. skill을 써도 반복되며 기계적으로 검증할 수 있을 때만 script·GitHub Actions·hook으로 자동화한다.

사용되지 않거나 대상 프로젝트에 없는 도구를 가정하는 문서·skill·자동화는 제거한다.

## 개인 설정과 팀 공유 설정

| 설정 종류                                                        | 위치                                          | 이유                                                                     |
| ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| 개인 실험 기능 플래그(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 등) | `.claude/settings.local.json`, 개인 전역 설정 | 개인 선호이며 다른 기여자의 기본 동작을 바꾸면 안 된다                   |
| 모든 세션에 적용돼야 하는 차단 규칙(hook)                        | `.claude/settings.json`, `.codex/hooks.json`  | 팀 전체가 같은 안전 기준을 따라야 한다                                   |
| Codex MCP 서버 등록, sandbox·승인 정책                           | 사용자 `~/.codex/config.toml`                 | 개인 도구 선호이며 secret이 섞일 수 있다                                 |
| Node·package manager 버전                                        | `.nvmrc`, `package.json`                      | 실행되는 산출물이 이미 source of truth다(agent config에 중복하지 않는다) |

hook은 아래에 모두 해당할 때만 repo에 추가한다.

- 모든 기여자가 예외 없이 같은 정책을 따라야 한다(예: 이 저장소는 Yarn만 쓴다).
- 되돌리기 어렵거나 안전이 중요한 동작을 차단·확인해야 한다.
- 문서나 skill만으로는 반복적으로 놓친다는 근거가 있다.

조건을 만족하지 않으면 hook을 만들지 않는다. hook은 모든 tool 호출에 실행 비용과 실패 지점을 추가하므로, 문서로 충분한 규칙까지 hook으로 옮기지 않는다.

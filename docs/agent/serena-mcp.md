# Serena MCP

Serena는 symbol·reference 탐색 같은 semantic code navigation을 위한 MCP 서버다. 제한적으로 팀 공용 도입한다.

## 결론

- repo에는 `.serena/project.yml`만 커밋한다.
- MCP 서버 등록은 각 개발자 로컬(Claude Code는 user scope, Codex는 global)에 둔다. repo에 개인 등록 파일을 커밋하지 않는다.
- 사용 목적은 semantic navigation, symbol/reference 탐색, diagnostics다.
- `.serena/project.yml`의 `read_only: true`를 유지한다. 파일 수정은 기존 Edit/apply_patch, repo workflow, 검증 명령이 계속 담당한다.
- Serena memory를 `docs/`, spec, API 계약의 대체 source of truth로 쓰지 않는다.

## 설치

Serena는 repo dependency로 추가하지 않는다. 각 개발자가 로컬 도구로 설치한다.

```bash
brew install uv   # 이미 있으면 생략
uv tool install -p 3.13 serena-agent
```

`uv tool install`이 만든 실행 파일은 `~/.local/bin`에 있다. 이 경로가 PATH에 없으면 Claude Code·Codex가 MCP 서버를 `ENOENT`로 못 찾으므로, MCP 등록 시 아래처럼 절대경로를 쓴다.

## MCP 등록

```bash
serena init
claude mcp add --scope user serena -- "$(command -v serena || echo ~/.local/bin/serena)" start-mcp-server --context=claude-code --project-from-cwd
codex mcp add serena -- "$(command -v serena || echo ~/.local/bin/serena)" start-mcp-server --context=codex --project-from-cwd
```

`serena setup claude-code`, `serena setup codex` 명령도 같은 등록을 시도하지만 bare `serena` 커맨드로 등록해 PATH에 `~/.local/bin`이 없으면 연결에 실패한다. `claude mcp list`, `codex mcp list`로 연결 상태를 확인하고, 실패하면 절대경로로 다시 등록한다.

## 프로젝트 설정

repo-local 설정은 `.serena/project.yml`에 있다.

- `project_name: "bunch"`
- `language_servers: [typescript]`
- `ignore_all_files_in_gitignore: true`
- `read_only: true`

새 workspace가 TypeScript가 아닌 스택으로 추가되면 `language_servers`를 갱신한다.

## 사용 원칙

- 큰 파일을 통째로 읽기 전에 symbol 탐색으로 필요한 범위를 먼저 좁힌다.
- 함수·타입의 사용처를 찾을 때 grep보다 reference 탐색을 우선 검토한다.
- Serena가 제안하는 편집은 `read_only: true`로 비활성화되어 있으므로 실제 파일 변경은 항상 기존 도구로 한다.

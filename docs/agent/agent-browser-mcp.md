# Agent Browser MCP

`agent-browser`는 브라우저를 직접 열어 조작·스크린샷·접근성 snapshot을 받는 MCP 서버다. 선택적으로 쓴다.

## 결론

- repo에 아무것도 커밋하지 않는다. 설치·MCP 등록 모두 개인 로컬 도구다.
- 사용 목적은 UI 변경의 live 확인(keyboard, focus, loading·error·empty 상태, 좁은 viewport)이다. `docs/workflows/local-development.md`의 수동 확인 단계를 대신 실행하는 용도로 쓴다.
- Playwright E2E를 대체하지 않는다. 회귀 방지가 필요한 흐름은 여전히 `e2e/`에 테스트로 남긴다. agent-browser는 1회성 확인·디버깅용이다.
- `network`, `debug`, `react` 같은 확장 tool profile은 필요할 때만 켠다. 기본 `core` profile로 충분한 경우가 대부분이다.

## 설치

각 개발자가 로컬 도구로 설치한다.

```bash
brew install agent-browser   # 또는 npm install -g agent-browser, cargo install agent-browser
agent-browser install        # Chrome for Testing 다운로드
```

## MCP 등록

```bash
claude mcp add --scope user agent-browser -- "$(command -v agent-browser)" mcp
codex mcp add agent-browser -- "$(command -v agent-browser)" mcp
```

`agent-browser`를 bare 커맨드로 등록하면 PATH에 따라 `ENOENT`가 날 수 있다. `command -v agent-browser`로 절대경로를 넣는다. `claude mcp list`, `codex mcp list`로 연결을 확인한다.

## 사용 원칙

- 화면을 열어 실제로 상호작용한 뒤 보고한다. 스크린샷 하나만 보고 통과로 표현하지 않는다.
- 접근성 snapshot(`agent-browser snapshot` 계열)으로 keyboard·focus·aria 상태를 구조적으로 확인할 수 있으면 우선 사용한다.
- 로그인, 쿠키 같은 세션 상태를 다루면 개인 프로필에만 남기고 repo에 저장하지 않는다.

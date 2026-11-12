# React DevTools MCP

agent가 React DevTools와 같은 정보(컴포넌트 트리, props, hook, owner, 소스 위치, 렌더 시간)를 직접 읽게 한다. 렌더 성능 진단과 "이 화면의 이 요소가 어느 컴포넌트인지" 찾는 데 쓴다. 실험 기능이라 도구 이름과 출력이 버전마다 바뀔 수 있다.

## 결론

- 두 부분으로 나뉜다. 페이지 쪽 라이브러리 `react-devtools-cdt-mcp`는 repo에 들어 있고, MCP 서버 Chrome DevTools MCP는 각자 등록한다.
- apps/web 개발 서버(`yarn dev`)에서만 동작한다. `next.config.mjs`가 webpack 개발 빌드의 클라이언트 진입점(`main-app`) 맨 앞에 등록 코드를 넣는다. 운영 빌드에는 들어가지 않는다.
- 서드파티 도구 옵션 `--categoryExperimentalThirdParty`를 켠 Chrome DevTools MCP가 페이지의 `react` 도구 묶음을 찾아 쓴다.
- 등록하지 않아도 개발 서버와 테스트는 그대로 동작한다. 쓰고 싶은 사람만 등록한다.

## MCP 등록

Chrome DevTools MCP는 Node 20.19 이상과 Chrome 안정 버전이 필요하다. 버전은 고정해서 등록한다(2026-11-11 기준 `1.12.0`).

```bash
claude mcp add --scope user chrome-devtools -- npx -y chrome-devtools-mcp@1.12.0 --categoryExperimentalThirdParty --no-usage-statistics --no-performance-crux
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@1.12.0 --categoryExperimentalThirdParty --no-usage-statistics --no-performance-crux
```

- 이 명령은 저장소 밖 개인 도구 등록이라 `npx`를 쓴다. 저장소 안의 패키지 관리는 Yarn만 쓴다(`docs/conventions/package-management.md`).
- `--no-usage-statistics`는 사용 통계 전송을, `--no-performance-crux`는 성능 기록 주소의 CrUX 조회를 끈다.
- 등록한 뒤 Claude Code·Codex 세션을 새로 시작해야 도구가 보인다. `claude mcp list`, `codex mcp list`로 연결을 확인한다.
- Chrome DevTools MCP는 자기 Chrome 창(전용 프로필)을 연다. 처음 한 번은 그 창에서 로그인해 둔다. 로그인 정보는 그 프로필에만 남고 repo에는 저장하지 않는다.
- Codex를 nvm으로 설치한 Node가 아닌 환경에서 실행하면, `npx`가 다른 Node(예: Homebrew Node 26)로 돌 수 있다. 그때는 `~/.codex/config.toml`의 `[mcp_servers.chrome-devtools]`에 `npx` 절대 경로를 `command`로 넣고, `[mcp_servers.chrome-devtools.env]`의 `PATH` 맨 앞에 같은 Node의 `bin`을 둔다. Node 버전을 바꾸면 두 경로도 함께 고친다.

## agent에게 부탁하는 예

새 세션에서 개발 서버를 켠 뒤 아래처럼 부탁한다. agent가 화면을 열고 위 도구를 골라 쓴다.

| 하고 싶은 것              | 예시 요청                                                                     |
| ------------------------- | ----------------------------------------------------------------------------- |
| 렌더 성능 측정            | "번치 홈에서 탭 전환할 때 React 렌더 기록해서 가장 오래 걸린 컴포넌트 알려줘" |
| 불필요한 리렌더 찾기      | "번치 전환 시트 열 때 어떤 컴포넌트가 몇 번 렌더되는지 봐줘"                  |
| 화면 요소의 컴포넌트 찾기 | "이 화면의 '새로운 번치 추가하기' 버튼이 어느 컴포넌트·파일인지 찾아줘"       |
| 상태 디버깅               | "`BunchHomeScreen`의 props랑 hook 값 보여줘"                                  |
| 전후 비교                 | "고치기 전후로 같은 조작을 하고 commit 수와 렌더 시간 비교해줘"               |

- 화면 확인·클릭·스크린샷만 필요하면 agent-browser(`docs/agent/agent-browser-mcp.md`)로 충분하다. React 내부(컴포넌트·props·hook·렌더 시간)를 볼 때 Chrome DevTools MCP를 쓴다.
- 개발 서버를 가짜 서버(`NEXT_PUBLIC_API_MOCKING`)로 켜면 항상 가입을 마친 사용자로 응답해 로그인 화면이 보이지 않는다. 로그인 화면이나 실서버 데이터를 보려면 가짜 서버를 끄고 띄운다.

## 사용 흐름

1. `yarn dev`로 개발 서버를 띄운다.
2. Chrome DevTools MCP로 `http://localhost:3000`의 확인할 화면을 연다.
3. `list_3p_developer_tools`로 `react` 묶음이 보이는지 확인한다.
4. `execute_3p_developer_tool`로 아래 도구를 부른다.

| 목적                         | 도구                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| 컴포넌트 찾기                | `react_find_components`(`name`), `react_get_component_tree`                                    |
| props·hook 보기              | `react_get_component_by_uid`(`uid`, `includeHooks: true`)                                      |
| 화면 요소에서 컴포넌트 찾기  | `react_get_component_by_dom_element`                                                           |
| 위치·만든 컴포넌트·정의 파일 | `react_get_parent_stack`, `react_get_owner_stack`, `react_get_component_source`                |
| 렌더 시간 기록               | `react_start_profiling` → 화면 조작 → `react_stop_profiling`                                   |
| 기록 읽기                    | `react_get_trace_overview`(`traceName`), `react_get_commit_report`(`traceName`, `commitIndex`) |

- uid(`r5` 같은 값)는 새로고침하면 바뀐다. 새로고침 뒤에는 `react_find_components`로 다시 받는다.
- React Compiler를 켜 두어 최적화된 컴포넌트 이름이 `Forget(BunchHomeScreen)`처럼 보인다. 찾을 때는 원래 이름(`BunchHomeScreen`)으로 찾는다.
- 트리에는 Next.js 개발 도구 화면의 React 트리도 함께 잡힌다. 앱 컴포넌트만 보려면 이름으로 찾는다.
- 렌더 시간 측정 방법은 `docs/workflows/performance.md`의 "렌더 측정"을 따른다.

## 등록 위치를 진입점으로 둔 이유

라이브러리는 react-dom보다 먼저 hook에 붙어야 한다. Next.js 개발 모드는 `instrumentation-client`보다 먼저 자기 개발 도구 화면을 불러온다. 이 화면이 가진 react-dom이 먼저 hook에 연결되면 모든 도구가 `Missing internals for renderer 0` 오류를 낸다. 그래서 `next.config.mjs`의 webpack 설정에서 진입점 맨 앞에 넣는다. 이 방식에서도 Fast Refresh가 동작하는 것을 확인했다(2026-11-11).

- Turbopack으로 개발 서버를 바꾸면 이 설정이 적용되지 않는다. 그때 다시 등록 위치를 정한다.
- 라이브러리가 모든 commit을 기록하게 해서 개발 서버가 느려질 수 있다. 측정한 적은 없다.

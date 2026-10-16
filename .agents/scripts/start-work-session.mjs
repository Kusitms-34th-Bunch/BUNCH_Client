import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

export function prepareSession(worktree, handoff) {
  const cwd = realpathSync(worktree);
  const git = (...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
  if (
    realpathSync(git('rev-parse', '--absolute-git-dir')) ===
    realpathSync(git('rev-parse', '--path-format=absolute', '--git-common-dir'))
  ) {
    throw new Error('별도 worktree에서만 세션을 시작할 수 있습니다.');
  }
  if (realpathSync(git('rev-parse', '--show-toplevel')) !== cwd) {
    throw new Error('worktree의 루트 경로를 지정하세요.');
  }
  const branch = git('branch', '--show-current');
  if (!branch || ['develop', 'main', 'master'].includes(branch)) {
    throw new Error('작업 브랜치가 필요합니다(develop·main·master·detached HEAD 제외).');
  }
  const memo = readFileSync(handoff, 'utf8').trim();
  if (!memo) throw new Error('인계문이 비어 있습니다.');
  return {
    cwd,
    prompt: `AGENTS.md를 읽고 아래 담당 작업만 구현·검증하세요. 다른 세션의 파일을 수정하거나 추가 세션을 실행하지 마세요. commit·push·PR·merge는 수행하지 마세요. 완료 시 변경 파일·검증 결과·남은 문제를 보고하세요.\n\n${memo}`,
  };
}

// CLI별 세션 ID 형식 검증(Codex는 영숫자·하이픈, Claude는 UUID)
const CODEX_SESSION_ID = /^[a-zA-Z0-9-]+$/;
const CLAUDE_SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 검증용 Yarn 명령만 사전 허용(정확한 명령 또는 공백을 둔 `<명령> *` 접두사)
// 그 밖의 명령은 비대화형이라 자동 거부(`--permission-prompts none`), 우회 옵션 미사용
const CLAUDE_ALLOWED_TOOLS = [
  'Bash(yarn verify)',
  'Bash(yarn test)',
  'Bash(yarn test *)',
  'Bash(yarn lint)',
  'Bash(yarn typecheck)',
  'Bash(yarn build)',
  'Bash(yarn format:check)',
  'Bash(yarn check:suspicious)',
  'Bash(yarn check:generated)',
  'Bash(yarn check:catalog)',
  'Bash(yarn check:agent-docs)',
  'Bash(yarn check:boundaries)',
];

function codexTracker(report) {
  const state = { started: false, failed: false, completed: false };
  return {
    read(event) {
      if (event.type === 'thread.started') {
        if (!CODEX_SESSION_ID.test(event.thread_id ?? '')) {
          throw new Error('유효한 세션 ID를 받지 못했습니다.');
        }
        state.started = true;
        report(`세션: codex://threads/${event.thread_id}`);
        report(`재개: codex resume ${event.thread_id}`);
      }
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        report(event.item.text);
      }
      if (event.type === 'turn.failed' || event.type === 'error') state.failed = true;
      if (event.type === 'turn.completed') state.completed = true;
    },
    succeeded: () => state.started && state.completed && !state.failed,
  };
}

// 인증 실패도 `result.subtype: "success"`로 오고 `is_error: true`로만 구분
// 성공 판정은 subtype 대신 `is_error`·`terminal_reason` 기준
function claudeTracker(report) {
  const state = { sessionId: null, completed: false, failed: false };
  return {
    read(event) {
      if (event.type === 'system' && event.subtype === 'init') {
        if (!CLAUDE_SESSION_ID.test(event.session_id ?? '')) {
          throw new Error('유효한 세션 ID를 받지 못했습니다.');
        }
        state.sessionId = event.session_id;
        report(`세션 ID: ${event.session_id}`);
        report(`재개: claude --resume ${event.session_id} (이 worktree에서 실행)`);
      }
      if (event.type === 'assistant' && event.error) state.failed = true;
      if (event.type === 'result') {
        state.completed = true;
        if (
          event.is_error !== false ||
          event.subtype !== 'success' ||
          event.terminal_reason !== 'completed' ||
          (state.sessionId && event.session_id !== state.sessionId)
        ) {
          state.failed = true;
        }
        if (typeof event.result === 'string' && event.result.trim()) report(event.result);
        const denied = event.permission_denials?.length ?? 0;
        if (denied > 0) report(`권한 거부 ${denied}건: 허용되지 않은 명령은 실행되지 않았습니다.`);
      }
    },
    succeeded: () => state.sessionId !== null && state.completed && !state.failed,
  };
}

export const AGENTS = {
  codex: {
    command: 'codex',
    args: (cwd) => ['exec', '--cd', cwd, '--sandbox', 'workspace-write', '--json', '-'],
    track: codexTracker,
  },
  claude: {
    command: 'claude',
    args: () => [
      '-p',
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-mode',
      'acceptEdits',
      '--permission-prompts',
      'none',
      '--allowedTools',
      ...CLAUDE_ALLOWED_TOOLS,
    ],
    track: claudeTracker,
  },
};

export async function startSession(session, launch = spawn, report = console.log, agent = 'codex') {
  const adapter = AGENTS[agent];
  if (!adapter) throw new Error(`지원하지 않는 실행 대상입니다: ${agent}`);
  const env = { ...process.env };
  // 호출 폴더의 Yarn PnP 로더·실행 정보가 새 세션에 전파되는 것 방지
  for (const key of ['NODE_OPTIONS', 'NODE_PATH', 'PROJECT_CWD', 'INIT_CWD', 'BERRY_BIN_FOLDER']) {
    delete env[key];
  }
  const child = launch(adapter.command, adapter.args(session.cwd), {
    cwd: session.cwd,
    stdio: ['pipe', 'pipe', 'inherit'],
    shell: false,
    env,
  });
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
  const interrupt = () => child.kill('SIGINT');
  const terminate = () => child.kill('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  const cleanup = () => {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', terminate);
  };
  completion.then(cleanup, cleanup);
  // 프로세스 시작 실패는 아래 stream 처리 전에 발생 가능
  completion.catch(() => {});
  child.stdin.on('error', () => {});
  child.stdin.end(session.prompt);
  const tracker = adapter.track(report);
  try {
    for await (const line of createInterface({ input: child.stdout })) {
      if (!line.trim()) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        // 오류 메시지에 CLI 출력 조각이 섞이는 것 방지
        throw new Error('CLI 출력이 JSON 형식이 아닙니다.');
      }
      tracker.read(event);
    }
  } catch (error) {
    child.kill();
    await completion.catch(() => {});
    throw error;
  }
  const code = await completion;
  if (code !== 0 || !tracker.succeeded()) {
    throw new Error(`세션 실행 실패(${agent}, exit ${code}). 인증·권한과 CLI 오류를 확인하세요.`);
  }
}

export function parseArguments(argv) {
  const positional = [];
  let agent;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--agent' || argument.startsWith('--agent=')) {
      if (agent !== undefined) throw new Error('--agent는 한 번만 지정하세요.');
      agent = argument === '--agent' ? argv[(index += 1)] : argument.slice('--agent='.length);
      if (agent === undefined) throw new Error('--agent에 codex 또는 claude를 지정하세요.');
    } else if (argument.startsWith('--')) {
      throw new Error(`지원하지 않는 옵션입니다: ${argument}`);
    } else {
      positional.push(argument);
    }
  }
  if (positional.length !== 2) {
    throw new Error(
      '사용법: yarn agent:session [--agent codex|claude] <worktree 경로> <인계문 파일>',
    );
  }
  // 옵션 생략 시 기본값은 Codex, 각 agent는 자신의 CLI를 명시
  agent ??= 'codex';
  if (!Object.hasOwn(AGENTS, agent)) {
    throw new Error(`지원하지 않는 실행 대상입니다: ${agent}(codex 또는 claude)`);
  }
  return { agent, worktree: positional[0], handoff: positional[1] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { agent, worktree, handoff } = parseArguments(process.argv.slice(2));
    console.log(`실행 대상: ${agent}`);
    await startSession(prepareSession(worktree, handoff), spawn, console.log, agent);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

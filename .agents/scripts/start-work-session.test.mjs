import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { AGENTS, parseArguments, prepareSession, startSession } from './start-work-session.mjs';

test('별도 worktree 루트와 비어 있지 않은 인계문만 허용한다', () => {
  const root = mkdtempSync(join(tmpdir(), 'bunch-session-'));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  try {
    git('init');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '--allow-empty',
      '-m',
      'init',
    );
    const tree = join(root, '작업 폴더');
    git('worktree', 'add', '-b', 'test-session', tree);
    const memo = join(root, 'handoff.md');
    writeFileSync(memo, '담당: icons\n다음: 검증');
    assert.throws(() => prepareSession(root, memo), /별도 worktree/);
    const session = prepareSession(tree, memo);
    assert.match(session.prompt, /담당: icons/);
    assert.match(session.prompt, /commit·push·PR·merge는 수행하지/);
    mkdirSync(join(tree, 'subdir'));
    assert.throws(() => prepareSession(join(tree, 'subdir'), memo), /루트 경로/);
    execFileSync('git', ['-C', tree, 'switch', '-c', 'develop'], { stdio: 'pipe' });
    assert.throws(() => prepareSession(tree, memo), /작업 브랜치/);
    execFileSync('git', ['-C', tree, 'switch', '--detach'], { stdio: 'pipe' });
    assert.throws(() => prepareSession(tree, memo), /작업 브랜치/);
    execFileSync('git', ['-C', tree, 'switch', 'test-session'], { stdio: 'pipe' });
    writeFileSync(memo, '  ');
    assert.throws(() => prepareSession(tree, memo), /비어/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function fakeLaunch(events, exitCode = 0) {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.kill = () => child.emit('close', 1);
  return {
    child,
    launch(command, args, options) {
      assert.equal(command, 'codex');
      assert.deepEqual(args, [
        'exec',
        '--cd',
        '/tmp/task',
        '--sandbox',
        'workspace-write',
        '--json',
        '-',
      ]);
      assert.equal(options.shell, false);
      assert.equal('NODE_OPTIONS' in options.env, false);
      assert.equal('PROJECT_CWD' in options.env, false);
      process.nextTick(() => {
        for (const event of events) child.stdout.write(`${JSON.stringify(event)}\n`);
        child.stdout.end();
        child.emit('close', exitCode);
      });
      return child;
    },
  };
}

const session = { cwd: '/tmp/task', prompt: '작업 $(touch /tmp/never) `never`' };
const started = { type: 'thread.started', thread_id: 'test-thread-123' };
const completed = { type: 'turn.completed' };

test('인계문은 stdin으로 전달하고 실제 ID로 딥링크와 재개 명령을 만든다', async () => {
  const mock = fakeLaunch([
    started,
    { type: 'item.completed', item: { type: 'agent_message', text: '검증 완료' } },
    completed,
  ]);
  const messages = [];
  await startSession(session, mock.launch, (value) => messages.push(value));
  assert.equal(mock.child.stdin.read().toString(), session.prompt);
  assert.deepEqual(messages, [
    '세션: codex://threads/test-thread-123',
    '재개: codex resume test-thread-123',
    '검증 완료',
  ]);
});

test('실행 실패·실패 이벤트·ID 누락을 성공으로 처리하지 않는다', async () => {
  for (const mock of [
    fakeLaunch([started], 1),
    fakeLaunch([started]),
    fakeLaunch([started, { type: 'turn.failed' }]),
    fakeLaunch([]),
    fakeLaunch([{ ...started, thread_id: '../invalid' }]),
  ]) {
    await assert.rejects(startSession(session, mock.launch, () => {}));
  }
});

test('중단 신호를 CLI에 전달하고 signal listener를 정리한다', async () => {
  const previous = process.listeners('SIGTERM');
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.kill = (signal) => {
    assert.equal(signal, 'SIGTERM');
    child.stdout.end();
    child.emit('close', null);
  };
  const running = startSession(
    session,
    () => child,
    () => {},
  );
  const handler = process.listeners('SIGTERM').find((listener) => !previous.includes(listener));
  assert.ok(handler);
  handler();
  await assert.rejects(running, /세션 실행 실패/);
  assert.deepEqual(process.listeners('SIGTERM'), previous);
});

// Claude 이벤트: `-p --output-format stream-json --verbose` 출력에서 판정에 쓰는 필드만 남긴 단순화 형태
// (hook·rate_limit·user·tool_use 이벤트와 message 본문은 생략, 알 수 없는 이벤트는 무시)
const claudeId = '5722f018-fad7-4e2b-85f3-02bc6cad4acc';
const claudeHook = { type: 'system', subtype: 'hook_started', session_id: claudeId };
const claudeInit = { type: 'system', subtype: 'init', session_id: claudeId };
const claudeResult = {
  type: 'result',
  subtype: 'success',
  session_id: claudeId,
  is_error: false,
  result: '검증 완료',
  terminal_reason: 'completed',
  permission_denials: [],
};

function fakeClaude(events, exitCode = 0) {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.kill = () => child.emit('close', 143);
  return {
    child,
    launch(command, args, options) {
      assert.equal(command, 'claude');
      assert.deepEqual(args, AGENTS.claude.args());
      assert.equal(options.shell, false);
      assert.equal(options.cwd, '/tmp/task');
      assert.equal('NODE_OPTIONS' in options.env, false);
      process.nextTick(() => {
        for (const event of events) child.stdout.write(`${JSON.stringify(event)}\n`);
        child.stdout.end();
        child.emit('close', exitCode);
      });
      return child;
    },
  };
}

test('Claude 명령은 비대화형 stream-json과 확인된 권한 옵션만 사용한다', () => {
  const args = AGENTS.claude.args();
  assert.deepEqual(args.slice(0, args.indexOf('--allowedTools')), [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    '--permission-prompts',
    'none',
  ]);
  const joined = args.join(' ');
  assert.doesNotMatch(joined, /dangerously|bypassPermissions|skip-permissions/);
  const tools = args.slice(args.indexOf('--allowedTools') + 1);
  assert.deepEqual(tools, [
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
  ]);
  // 접두사 허용은 공백을 둔 `<명령> *` 형태만, 공백 없는 `*`는 이름이 비슷한 다른 명령까지 허용
  assert.ok(tools.every((tool) => !tool.includes('*') || / \*\)$/.test(tool)));
  assert.ok(tools.every((tool) => !/dlx|format\)|lint \*/.test(tool)));
});

test('자식 프로세스에는 호출 폴더의 Yarn 실행 정보를 넘기지 않는다', async () => {
  const keys = ['NODE_OPTIONS', 'NODE_PATH', 'PROJECT_CWD', 'INIT_CWD', 'BERRY_BIN_FOLDER'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) process.env[key] = '/tmp/caller';
  try {
    for (const [agent, mock] of [
      ['claude', fakeClaude([claudeInit, claudeResult])],
      ['codex', fakeLaunch([started, completed])],
    ]) {
      const launch = (command, args, options) => {
        for (const key of keys) assert.equal(key in options.env, false, `${agent}: ${key}`);
        return mock.launch(command, args, options);
      };
      await startSession(session, launch, () => {}, agent);
    }
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('JSON이 아닌 CLI 출력은 내용을 노출하지 않고 실패로 처리한다', async () => {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.kill = () => child.emit('close', 1);
  const launch = () => {
    process.nextTick(() => {
      child.stdout.write('secret-token-in-output\n');
      child.stdout.end();
    });
    return child;
  };
  await assert.rejects(
    startSession(session, launch, () => {}, 'claude'),
    (error) => {
      assert.match(error.message, /JSON 형식이 아닙니다/);
      assert.doesNotMatch(error.message, /secret-token/);
      return true;
    },
  );
});

test('Claude 세션은 stdin 인계문, 세션 ID, 재개 명령을 출력하고 딥링크는 만들지 않는다', async () => {
  const mock = fakeClaude([
    claudeHook,
    claudeInit,
    { type: 'assistant', session_id: claudeId },
    claudeResult,
  ]);
  const messages = [];
  await startSession(session, mock.launch, (value) => messages.push(value), 'claude');
  assert.equal(mock.child.stdin.read().toString(), session.prompt);
  assert.deepEqual(messages, [
    `세션 ID: ${claudeId}`,
    `재개: claude --resume ${claudeId} (이 worktree에서 실행)`,
    '검증 완료',
  ]);
  assert.ok(messages.every((message) => !/:\/\//.test(message)));
});

test('Claude 권한 거부는 건수만 알리고 성공한 세션을 실패로 바꾸지 않는다', async () => {
  const mock = fakeClaude([
    claudeInit,
    { ...claudeResult, permission_denials: [{ tool_name: 'Bash' }, { tool_name: 'Bash' }] },
  ]);
  const messages = [];
  await startSession(session, mock.launch, (value) => messages.push(value), 'claude');
  assert.ok(messages.some((message) => message.startsWith('권한 거부 2건')));
});

test('Claude 인증 실패는 subtype이 success여도 성공으로 처리하지 않는다', async () => {
  // 로그인 없음 → result.subtype=success, is_error=true, terminal_reason=api_error
  const authFailure = [
    claudeInit,
    { type: 'assistant', session_id: claudeId, error: 'authentication_failed' },
    {
      ...claudeResult,
      is_error: true,
      result: 'Not logged in · Please run /login',
      terminal_reason: 'api_error',
    },
  ];
  // CLI가 종료 코드 0이어도 이벤트가 실패면 실패
  for (const exitCode of [1, 0]) {
    await assert.rejects(
      startSession(session, fakeClaude(authFailure, exitCode).launch, () => {}, 'claude'),
      /세션 실행 실패\(claude/,
    );
  }
});

test('Claude 세션 ID 누락·형식 오류·결과 누락·ID 불일치·중단을 성공으로 처리하지 않는다', async () => {
  for (const mock of [
    fakeClaude([claudeResult]),
    fakeClaude([claudeInit]),
    fakeClaude([claudeInit], 143),
    fakeClaude([claudeInit, { ...claudeResult, session_id: 'other-session' }]),
    fakeClaude([claudeInit, { ...claudeResult, terminal_reason: 'max_turns' }]),
    fakeClaude([claudeInit, { ...claudeResult, terminal_reason: undefined }]),
    fakeClaude([claudeInit, { ...claudeResult, subtype: 'error_during_execution' }]),
    fakeClaude([{ ...claudeInit, session_id: '../invalid' }, claudeResult]),
    fakeClaude([]),
  ]) {
    await assert.rejects(startSession(session, mock.launch, () => {}, 'claude'));
  }
});

test('Claude 실패는 Codex로 자동 전환하지 않는다', async () => {
  const commands = [];
  const launch = (command) => {
    commands.push(command);
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    process.nextTick(() => {
      child.stdout.end();
      child.emit('close', 1);
    });
    return child;
  };
  await assert.rejects(startSession(session, launch, () => {}, 'claude'));
  assert.deepEqual(commands, ['claude']);
});

test('Claude 실행 파일이 없으면 실패를 전달한다', async () => {
  const launch = () => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    process.nextTick(() => {
      child.emit('error', new Error('spawn claude ENOENT'));
      child.stdout.end();
      child.emit('close', -2);
    });
    return child;
  };
  await assert.rejects(
    startSession(session, launch, () => {}, 'claude'),
    /ENOENT/,
  );
});

test('지원하지 않는 실행 대상은 CLI를 시작하지 않고 거부한다', async () => {
  const launch = () => assert.fail('CLI를 시작하면 안 된다');
  await assert.rejects(
    startSession(session, launch, () => {}, 'gemini'),
    /지원하지 않는/,
  );
});

test('실행 대상을 --agent로 명확히 선택하고 생략하면 기존처럼 Codex다', () => {
  assert.deepEqual(parseArguments(['/w', '/m']), { agent: 'codex', worktree: '/w', handoff: '/m' });
  assert.equal(parseArguments(['--agent', 'claude', '/w', '/m']).agent, 'claude');
  assert.equal(parseArguments(['/w', '--agent=codex', '/m']).agent, 'codex');
  for (const bad of [
    ['--agent', 'gemini', '/w', '/m'],
    ['--agent=', '/w', '/m'],
    ['--agent'],
    ['/w', '/m', '--agent'],
    ['--agent', 'claude', '--agent', 'codex', '/w', '/m'],
    ['--unknown', '/w', '/m'],
    ['/w'],
    ['/w', '/m', '/extra'],
  ]) {
    assert.throws(() => parseArguments(bad), Error, bad.join(' '));
  }
});

test('CLI를 시작할 수 없으면 실패를 전달한다', async () => {
  const launch = () => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    process.nextTick(() => {
      child.emit('error', new Error('ENOENT'));
      child.stdout.end();
      child.emit('close', -2);
    });
    return child;
  };
  await assert.rejects(
    startSession(session, launch, () => {}),
    /ENOENT/,
  );
});

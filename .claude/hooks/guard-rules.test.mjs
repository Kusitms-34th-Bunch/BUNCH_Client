// guard-rules.mjs의 git 규칙 확인. 실행: node --test .claude/hooks/guard-rules.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('./guard-rules.mjs', import.meta.url));

function isDenied(command) {
  const result = spawnSync('node', [hook], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
  });

  return result.stdout.includes('"permissionDecision":"deny"');
}

const denied = [
  'git push --force origin feat',
  'git push -f origin feat',
  'git push -fu origin feat',
  'git push origin +feat',
  'git push origin main',
  'git push origin HEAD:main',
  'git push --force-with-lease origin main',
  'git commit --no-verify -m "fix: x"',
  'git commit -nm "fix: x"',
  'git push --no-verify',
  'HUSKY=0 git commit -m "fix: x"',
  'git add .',
  'git add -A',
  'git add --all',
  'git add -u',
  'git add *',
  'git -C apps/web add .',
  'yarn lint && git add -A',
  'git commit -a -m "fix: x"',
  'git commit -am "fix: x"',
  'git reset --hard HEAD~1',
  'git clean -fd',
  'git checkout .',
  'git checkout -- .',
  'git checkout -f main',
  'git restore .',
  'git stash pop',
  'git stash drop',
  'git branch -D old-branch',
  'npm install',
  'git commit -m "fix: x" -m "Co-Authored-By: Claude <noreply@anthropic.com>"',
  'git commit -m "$(cat <<\'EOF\'\nfix: x\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\nEOF\n)"',
  'gh pr create --title "[Fix] x" --body "🤖 Generated with [Claude Code](https://claude.com/claude-code)"',
];

const allowed = [
  'git status --short',
  'git diff',
  'git log --oneline -5',
  'git add apps/web/src/app/page.tsx',
  'git add -- docs/workflows/ci.md',
  'git add -p',
  'git commit -m "fix: add . to docs"',
  'git commit -m "docs: git add -A와 --no-verify는 금지"',
  'git commit -m "docs: Co-Authored-By 등 AI 출처 문구 금지 규칙 추가"',
  'git commit -m "docs: x" -m "Co-Authored-By: 홍길동 <hong@example.com>"',
  'git commit -m "$(cat <<\'EOF\'\nfix: x\n\ngit add -A\nEOF\n)"',
  'git push -u origin 12-feat/login-page',
  'git push --force-with-lease origin 12-feat/login-page',
  'git restore --staged .',
  'git restore docs/workflows/ci.md',
  'git checkout -b 12-feat/login-page',
  'git switch -c 12-feat/login-page',
  'git stash',
  'git stash list',
  'git stash apply',
  'git branch -d merged-branch',
  'yarn verify',
  'yarn workspace @app/web test',
];

for (const command of denied) {
  test(`막는다: ${command.split('\n')[0]}`, () => {
    assert.equal(isDenied(command), true);
  });
}

for (const command of allowed) {
  test(`허용한다: ${command.split('\n')[0]}`, () => {
    assert.equal(isDenied(command), false);
  });
}

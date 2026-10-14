import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

let payload;

try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const filePath = payload.tool_input?.file_path ?? '';

if (!/\.(ts|tsx)$/.test(filePath)) {
  process.exit(0);
}

const absFilePath = resolve(filePath);

// workspace root(apps/*, packages/*)는 각자 eslint.config를 가지므로, 가장 가까운 package.json 디렉터리에서 실행한다.
let workspaceDir = dirname(absFilePath);
while (workspaceDir !== dirname(workspaceDir) && !existsSync(`${workspaceDir}/package.json`)) {
  workspaceDir = dirname(workspaceDir);
}

const relativeFilePath = relative(workspaceDir, absFilePath);

try {
  const output = execFileSync('yarn', ['eslint', '--quiet', relativeFilePath], {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: 30_000,
  });
  console.log(output.trimEnd().split('\n').slice(-5).join('\n'));
} catch (error) {
  const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  console.log(output.trimEnd().split('\n').slice(-5).join('\n'));
}

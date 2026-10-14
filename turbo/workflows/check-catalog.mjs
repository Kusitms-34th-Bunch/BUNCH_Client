import { spawnSync } from 'node:child_process';

const yarnCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
const result = spawnSync(yarnCommand, ['constraints'], { stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

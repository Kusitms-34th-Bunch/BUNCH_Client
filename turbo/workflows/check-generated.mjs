import { spawnSync } from 'node:child_process';

const checks = [
  {
    name: 'Design-system barrel exports',
    command: ['workspace', '@app/design-system', 'gen:index:check'],
  },
  {
    name: 'Design-system component structure',
    bin: process.execPath,
    command: ['turbo/workflows/check-ds-components.mjs'],
  },
];

const yarnCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

for (const { name, bin = yarnCommand, command } of checks) {
  console.log(`Checking ${name}...`);

  const result = spawnSync(bin, command, { stdio: 'inherit' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Generated files are up to date.');

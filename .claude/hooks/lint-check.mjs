import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// workspace root(apps/*, packages/*)는 각자 eslint.config를 가지므로 가장 가까운 package.json 디렉터리에서 실행.
let workspaceDir = dirname(absFilePath);
while (workspaceDir !== dirname(workspaceDir) && !existsSync(`${workspaceDir}/package.json`)) {
  workspaceDir = dirname(workspaceDir);
}

const relativeFilePath = relative(workspaceDir, absFilePath);

const run = (args, cwd) => {
  try {
    // stdio 미지정 시 stderr가 부모로 바로 출력되어 같은 메시지 중복 출력
    const output = execFileSync('yarn', args, {
      cwd,
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(output.trimEnd().split('\n').slice(-5).join('\n'));
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    console.log(output.trimEnd().split('\n').slice(-5).join('\n'));
  }
};

run(['eslint', '--quiet', relativeFilePath], workspaceDir);

// Tailwind 표준 클래스 검사(편집기 suggestCanonicalClasses와 같은 판정, 대상 밖 파일은 스크립트가 제외)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
run(['workspace', '@app/design-system', 'check:tailwind', absFilePath], repoRoot);

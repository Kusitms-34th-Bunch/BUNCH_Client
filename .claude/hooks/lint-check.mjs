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

// 실패 출력만 모아 agent에게 돌려줌(PostToolUse stdout 일반 문자는 Claude Code·Codex 모두 모델에 전달되지 않음)
const failures = [];

const run = (label, args, cwd) => {
  try {
    execFileSync('yarn', args, {
      cwd,
      encoding: 'utf8',
      timeout: 30_000,
      // stdio 미지정 시 stderr가 부모로 바로 출력되어 같은 메시지 중복 출력
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // 시간 초과·실행 실패(종료 코드 없음)는 검사 결과가 아니라 막지 않음
    if (typeof error.status !== 'number') return;
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trimEnd();
    failures.push(`[${label}]\n${output.split('\n').slice(-20).join('\n')}`);
  }
};

run('eslint', ['eslint', '--quiet', relativeFilePath], workspaceDir);

// Tailwind 표준 클래스 검사(편집기 suggestCanonicalClasses와 같은 판정, 대상 밖 파일은 스크립트가 제외)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
run('tailwind', ['workspace', '@app/design-system', 'check:tailwind', absFilePath], repoRoot);

// 편집은 이미 끝났으므로 되돌리지 않고, 두 도구가 함께 지원하는 decision·reason으로 고칠 내용을 전달
if (failures.length > 0) {
  console.log(
    JSON.stringify({
      decision: 'block',
      reason: `${relativeFilePath} 검사 실패. 아래 오류를 고친 뒤 계속하세요.\n${failures.join('\n\n')}`,
    }),
  );
}

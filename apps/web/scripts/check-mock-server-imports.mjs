// 가짜 DB(`mocks/db`)를 쓰는 테스트가 가짜 서버(`mocks/server`)도 import하는지 검사
// PR CI의 `vitest --changed`는 import로 이어진 테스트만 고르므로, 서버를 import하지 않으면 handler 변경 때 빠짐
// ponytail: DB 없이 setup의 서버 응답에만 기대는 테스트는 못 잡음(docs/workflows/testing.md 규칙), develop push 전체 실행이 잡음
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const MOCK_DB = join(SRC, 'mocks', 'db');

const testFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return /\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

// 값 import만(타입 import 제외). 가짜 DB 본체·시작 데이터·초안 저장소, alias·상대 경로 모두
const usesMockDb =
  /^import(?!\s+type\b)[^;]*?from\s+['"](?:@\/mocks\/|(?:\.{1,2}\/)+(?:mocks\/)?)db(?:\/(?:index|seed|drafts))?['"]/m;
const importsServer =
  /^import\s+(?:[^;]*?from\s+)?['"](?:@\/mocks\/server|(?:\.{1,2}\/)+(?:mocks\/)?server)['"]/m;

// 시작 데이터 상수만 쓰는 순수 함수 테스트(서버 응답에 기대지 않음)
const ALLOWED = new Set(['features/my/lib/notificationPreferences.test.ts']);

const missing = testFiles(SRC)
  .filter((file) => !file.startsWith(MOCK_DB))
  .map((file) => ({ file, rel: relative(SRC, file) }))
  .filter(({ rel }) => !ALLOWED.has(rel))
  .filter(({ file }) => {
    const source = readFileSync(file, 'utf8');
    return usesMockDb.test(source) && !importsServer.test(source);
  })
  .map(({ rel }) => rel);

if (missing.length > 0) {
  console.error(
    `가짜 DB를 쓰는 테스트는 '@/mocks/server'도 import해야 합니다(docs/workflows/testing.md):\n${missing.map((file) => `  - src/${file}`).join('\n')}`,
  );
  process.exit(1);
}

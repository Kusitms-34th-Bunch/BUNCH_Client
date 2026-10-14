import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

const HEADER = '// @generated — run `yarn gen:index` to update';

const IGNORE = [/^index\.tsx?$/, /\.test\.tsx?$/, /\.stories\.tsx?$/, /\.d\.ts$/, /^\./];

const shouldIgnore = (name: string) => IGNORE.some((pattern) => pattern.test(name));

const displayPath = (path: string) => relative(process.cwd(), path).replace(/\\/g, '/');

const hasDefaultExport = async (filePath: string) => {
  const content = await readFile(filePath, 'utf-8');
  return /^export\s+default\b/m.test(content);
};

interface BarrelFile {
  path: string;
  content: string;
}

const generateBarrelsForDir = async (dirPath: string): Promise<BarrelFile[]> => {
  const entries = (await readdir(dirPath)).sort();
  const exportLines: string[] = [];
  const results: BarrelFile[] = [];

  for (const entry of entries) {
    if (shouldIgnore(entry)) continue;

    const fullPath = join(dirPath, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isDirectory()) {
      const nested = await generateBarrelsForDir(fullPath);
      results.push(...nested);
      if (nested.length > 0) {
        exportLines.push(`export * from './${entry}';`);
      }
      continue;
    }

    if (!/\.tsx?$/.test(entry)) continue;

    const stem = basename(entry, extname(entry));
    if (await hasDefaultExport(fullPath)) {
      exportLines.push(`export { default as ${stem} } from './${stem}';`);
    }
    exportLines.push(`export * from './${stem}';`);
  }

  if (exportLines.length > 0) {
    results.push({
      path: join(dirPath, 'index.ts'),
      content: `${HEADER}\n\n${exportLines.join('\n')}\n`,
    });
  }

  return results;
};

const main = async () => {
  const isCheck = process.argv.includes('--check');
  const barrels = await generateBarrelsForDir(SRC);

  if (isCheck) {
    const outdated: string[] = [];

    for (const { path, content } of barrels) {
      let existing = '';
      try {
        existing = await readFile(path, 'utf-8');
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
      if (existing !== content) outdated.push(displayPath(path));
    }

    if (outdated.length > 0) {
      console.error('barrel 파일이 최신 상태가 아닙니다:\n');
      outdated.forEach((path) => console.error(`  - ${path}`));
      console.error('\n  yarn gen:index 를 실행하세요.');
      process.exit(1);
    }

    console.log('모든 barrel 파일이 최신 상태입니다.');
    return;
  }

  for (const { path, content } of barrels) {
    await writeFile(path, content, 'utf-8');
    console.log(`  ${displayPath(path)}`);
  }
  console.log(`\n${barrels.length}개 barrel 파일을 동기화했습니다.`);
};

main().catch((err: unknown) => {
  console.error('오류:', err);
  process.exit(1);
});

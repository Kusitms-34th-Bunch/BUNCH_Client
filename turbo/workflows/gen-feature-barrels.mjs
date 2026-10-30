// apps/web의 feature별 `components/index.ts` 배럴 생성.
// route(`src/app`)가 `@/features/<feature>/components`에서 import하는 이름만 내보내 내부 부품의 공개 API화 방지.
// 사용: node turbo/workflows/gen-feature-barrels.mjs [--check]
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const WEB_SRC = join(ROOT, 'apps', 'web', 'src');
const FEATURES_DIR = join(WEB_SRC, 'features');
const APP_DIR = join(WEB_SRC, 'app');

const HEADER = '// @generated — run `yarn gen:feature-index` to update';
const NOTE =
  '// route가 import하는 화면 컴포넌트만 공개한다. feature 내부 파일은 이 배럴을 거치지 않고 상대 경로로 직접 import한다(순환 import 방지)';

const isCheck = process.argv.includes('--check');

const toPosix = (path) => path.split(sep).join('/');
const displayPath = (path) => toPosix(relative(ROOT, path));

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const isSource = (file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file);

// route가 배럴에서 가져오는 이름: `import { A, type B, C as D } from '@/features/<feature>/components'`
const IMPORT_RE = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@\/features\/([^/']+)\/components'/g;

const collectUsedNames = () => {
  const used = new Map();
  for (const file of walk(APP_DIR).filter(isSource)) {
    const text = readFileSync(file, 'utf-8');
    for (const [, specifiers, feature] of text.matchAll(IMPORT_RE)) {
      const names = used.get(feature) ?? new Set();
      for (const raw of specifiers.split(',')) {
        const name = raw
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        if (name) names.add(name);
      }
      used.set(feature, names);
    }
  }
  return used;
};

const DECLARATION_RE = (name) =>
  new RegExp(`^export\\s+(?:async\\s+)?(function|const|class|type|interface)\\s+${name}\\b`, 'm');

const buildBarrel = (feature, names, errors) => {
  const componentsDir = join(FEATURES_DIR, feature, 'components');
  const sources = walk(componentsDir).filter(
    (file) => isSource(file) && basename(file) !== 'index.ts',
  );
  const lines = [];

  for (const name of [...names].sort()) {
    const matches = sources
      .map((file) => ({ file, kind: DECLARATION_RE(name).exec(readFileSync(file, 'utf-8'))?.[1] }))
      .filter((match) => match.kind);
    if (matches.length !== 1) {
      errors.push(
        `${feature}: '${name}'을 components 안에서 ${matches.length === 0 ? '찾을 수 없습니다' : '여러 곳에서 찾았습니다'}.`,
      );
      continue;
    }
    const { file, kind } = matches[0];
    const path = `./${toPosix(relative(componentsDir, file)).replace(/\.tsx?$/, '')}`;
    const keyword = kind === 'type' || kind === 'interface' ? 'export type' : 'export';
    lines.push(`${keyword} { ${name} } from '${path}';`);
  }

  return `${HEADER}\n${NOTE}\n\n${lines.join('\n')}\n`;
};

const main = () => {
  const used = collectUsedNames();
  const errors = [];
  const expected = new Map();

  for (const feature of readdirSync(FEATURES_DIR)) {
    const componentsDir = join(FEATURES_DIR, feature, 'components');
    if (!existsSync(componentsDir)) continue;
    const names = used.get(feature);
    if (names?.size)
      expected.set(join(componentsDir, 'index.ts'), buildBarrel(feature, names, errors));
    else expected.set(join(componentsDir, 'index.ts'), null);
  }

  if (errors.length > 0) {
    errors.forEach((message) => console.error(message));
    process.exit(1);
  }

  const outdated = [];
  for (const [path, content] of expected) {
    const existing = existsSync(path) ? readFileSync(path, 'utf-8') : null;
    if (existing === content) continue;
    // 손으로 쓴 index.ts(생성 표식 없음)는 삭제하지 않음
    if (content === null && existing !== null && !existing.startsWith(HEADER)) continue;
    outdated.push(path);
    if (isCheck) continue;
    if (content === null) rmSync(path);
    else writeFileSync(path, content, 'utf-8');
    console.log(`  ${displayPath(path)}`);
  }

  if (isCheck) {
    if (outdated.length > 0) {
      console.error('feature components 배럴이 최신 상태가 아닙니다:\n');
      outdated.forEach((path) => console.error(`  - ${displayPath(path)}`));
      console.error('\n  yarn gen:feature-index 를 실행하세요.');
      process.exit(1);
    }
    console.log('모든 feature components 배럴이 최신 상태입니다.');
    return;
  }

  console.log(
    `\nfeature components 배럴 ${expected.size}개를 확인했습니다(${outdated.length}개 갱신).`,
  );
};

main();

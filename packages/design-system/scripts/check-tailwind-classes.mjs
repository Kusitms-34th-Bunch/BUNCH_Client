// Tailwind 표준 클래스 검사·수정(편집기 Tailwind IntelliSense의 suggestCanonicalClasses와 같은 판정)
// 사용: node scripts/check-tailwind-classes.mjs [--fix] [파일...]. 파일이 없으면 web·admin·design-system 소스 전체
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { __unstable__loadDesignSystem } from 'tailwindcss';

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_DIR, '..', '..');
const ROOTS = ['apps/web/src', 'apps/admin/src', 'packages/design-system/src'].map((dir) =>
  join(REPO_ROOT, dir),
);
const SKIP_DIRS = new Set(['node_modules', 'generated', '.omc']);
// 편집기와 같은 px→spacing 변환 기준(1rem = 16px)
const CANONICALIZE_OPTIONS = { rem: 16 };

export const loadTailwindDesignSystem = async () => {
  const require = createRequire(join(PACKAGE_DIR, 'package.json'));
  const tailwindDir = dirname(require.resolve('tailwindcss/package.json'));
  const css = `@import 'tailwindcss';\n${readFileSync(join(PACKAGE_DIR, 'tokens/tokens.css'), 'utf8')}`;
  return __unstable__loadDesignSystem(css, {
    base: PACKAGE_DIR,
    loadStylesheet: async (id, base) => {
      const path = id === 'tailwindcss' ? join(tailwindDir, 'index.css') : resolve(base, id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
  });
};

// 한 줄 안의 문자열 리터럴 내용(템플릿의 `${…}` 제외)
const STRING_LITERAL = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;

const createChecker = (designSystem) => {
  const cache = new Map();
  return (candidate) => {
    if (!cache.has(candidate)) {
      const isClass = designSystem.candidatesToCss([candidate])[0] != null;
      const canonical = isClass
        ? designSystem.canonicalizeCandidates([candidate], CANONICALIZE_OPTIONS)[0]
        : candidate;
      cache.set(candidate, canonical);
    }
    return cache.get(candidate);
  };
};

/** 소스에서 표준형과 다른 Tailwind 클래스 목록(줄 번호는 1부터) */
export const findNonCanonical = (source, designSystem) => {
  const toCanonical = createChecker(designSystem);
  const issues = [];
  source.split('\n').forEach((line, index) => {
    for (const [, , content] of line.matchAll(STRING_LITERAL)) {
      const tokens = content
        .replace(/\$\{[^}]*\}/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
      for (const token of tokens) {
        const canonical = toCanonical(token);
        if (canonical !== token) issues.push({ line: index + 1, from: token, to: canonical });
      }
    }
  });
  return issues;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 표준형으로 바꾼 소스(공백·따옴표로 구분된 같은 토큰만 교체) */
export const fixSource = (source, issues) => {
  const lines = source.split('\n');
  for (const { line, from, to } of issues) {
    const pattern = new RegExp(`(^|[\\s'"\`])${escapeRegExp(from)}(?=[\\s'"\`]|$)`, 'g');
    lines[line - 1] = lines[line - 1].replace(pattern, `$1${to}`);
  }
  return lines.join('\n');
};

const collectFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    if (SKIP_DIRS.has(entry)) return [];
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectFiles(path);
    return ['.ts', '.tsx'].includes(extname(path)) ? [path] : [];
  });

const isInRoots = (path) => ROOTS.some((root) => !relative(root, path).startsWith('..'));

const main = async () => {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const given = args.filter((arg) => arg !== '--fix').map((arg) => resolve(arg));
  // lint-staged가 넘긴 파일 중 검사 대상 밖(mobile-shell 등)은 제외
  const files = given.length > 0 ? given.filter(isInRoots) : ROOTS.flatMap(collectFiles);
  if (files.length === 0) return;

  const designSystem = await loadTailwindDesignSystem();
  let remaining = 0;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const issues = findNonCanonical(source, designSystem);
    if (issues.length === 0) continue;
    if (shouldFix) {
      writeFileSync(file, fixSource(source, issues));
      const left = findNonCanonical(readFileSync(file, 'utf8'), designSystem);
      remaining += left.length;
      for (const { line, from, to } of left)
        console.error(`${relative(REPO_ROOT, file)}:${line}  ${from} → ${to} (자동 수정 실패)`);
      continue;
    }
    remaining += issues.length;
    for (const { line, from, to } of issues)
      console.error(`${relative(REPO_ROOT, file)}:${line}  ${from} → ${to}`);
  }

  if (remaining > 0) {
    console.error(
      `\nTailwind 표준 클래스가 아닌 곳 ${remaining}개. \`yarn check:tailwind --fix\`로 고칩니다.`,
    );
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

// 비활성 스크립트 — docs/architecture/design-system-icons.md의 활성화 절차를 먼저 따른다.
// package.json에 등록되지 않았고 @svgr 의존성도 설치돼 있지 않다.

import { transform } from '@svgr/core';
import jsxPlugin from '@svgr/plugin-jsx';
import svgoPlugin from '@svgr/plugin-svgo';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { format, resolveConfig } from 'prettier';

const GENERATED_TAG = '// @generated';
const CHECK_ONLY = process.argv.includes('--check');
const ICON_ROOT = join(process.cwd(), 'src/icons');
const CURRENT_COLOR_SOURCE_DIR = join(ICON_ROOT, 'svg');
const PRESERVE_COLOR_SOURCE_DIR = join(ICON_ROOT, 'svg-preserve');
const OUTPUT_DIR = join(ICON_ROOT, 'generated');

const svgrPlugins = [svgoPlugin, jsxPlugin];

// SVGR은 sanitizer가 아니다 — 변환 전에 신뢰할 수 없는 SVG 입력을 직접 걸러낸다.
// docs/architecture/design-system-icons.md의 "SVG 입력 검증" 기준과 함께 유지한다.
const UNSAFE_TAG_PATTERN = /<\s*(script|foreignObject|iframe|object|embed)\b/i;
const UNSAFE_EVENT_ATTR_PATTERN = /\son\w+\s*=/i;
const JAVASCRIPT_URL_PATTERN = /(href|xlink:href)\s*=\s*["']\s*javascript:/i;
const EXTERNAL_HREF_PATTERN = /(href|xlink:href)\s*=\s*["'](?!#)[^"']+["']/i;

const assertSafeSvg = (svg, fileName) => {
  const violations = [];
  if (UNSAFE_TAG_PATTERN.test(svg))
    violations.push('script/foreignObject/iframe/object/embed 태그');
  if (UNSAFE_EVENT_ATTR_PATTERN.test(svg)) violations.push('on* 이벤트 속성');
  if (JAVASCRIPT_URL_PATTERN.test(svg)) violations.push('javascript: URL');
  if (EXTERNAL_HREF_PATTERN.test(svg))
    violations.push('같은 문서 #fragment가 아닌 외부 href/xlink:href');

  if (violations.length > 0) {
    throw new Error(`안전하지 않은 SVG(${fileName}): ${violations.join(', ')}`);
  }
};

const toPascalCase = (value) => {
  return value
    .replace(/(^|[-_\s]+)([a-zA-Z0-9])/g, (_, separator, character) => {
      return `${separator}${character}`.toUpperCase().replace(separator, '');
    })
    .replace(/[^a-zA-Z0-9]/g, '');
};

const toComponentName = (fileName) => {
  const baseName = basename(fileName, extname(fileName));
  const pascalName = toPascalCase(baseName);

  if (!pascalName) {
    throw new Error(`Invalid icon file name: ${fileName}`);
  }

  return /(Icon|Logo|Brand|Symbol|Wordmark)$/.test(pascalName) ? pascalName : `${pascalName}Icon`;
};

const normalizeToCurrentColor = (svg) => {
  return svg
    .replace(
      /\s(fill|stroke)=["'](?!none|currentColor|transparent|url\()[^"']+["']/gi,
      ' $1="currentColor"',
    )
    .replace(/style=["'][^"']*["']/gi, '');
};

const readIconSources = async (sourceDir, preserveColors) => {
  let entries;

  try {
    entries = await readdir(sourceDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.svg')
    .map((entry) => ({
      componentName: toComponentName(entry.name),
      fileName: entry.name,
      filePath: join(sourceDir, entry.name),
      preserveColors,
    }));

  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readIconSources(join(sourceDir, entry.name), preserveColors)),
  );

  return [...files, ...nested.flat()];
};

const renderComponent = async (source) => {
  const rawSvg = await readFile(source.filePath, 'utf8');
  assertSafeSvg(rawSvg, source.fileName);
  const svg = source.preserveColors ? rawSvg : normalizeToCurrentColor(rawSvg);
  const componentCode = await transform(
    svg,
    {
      expandProps: 'end',
      jsxRuntime: 'automatic',
      plugins: svgrPlugins,
      prettier: false,
      svgo: true,
      svgoConfig: {
        plugins: [
          {
            name: 'preset-default',
            params: { overrides: { removeViewBox: false } },
          },
          { name: 'prefixIds', params: { prefix: source.componentName } },
          'removeDimensions',
        ],
      },
      typescript: true,
    },
    { componentName: source.componentName },
  );
  const prettierConfig =
    (await resolveConfig(join(OUTPUT_DIR, `${source.componentName}.tsx`))) ?? {};

  return format(`${GENERATED_TAG}\n${componentCode}`, { ...prettierConfig, parser: 'typescript' });
};

const renderIndex = async (sources) => {
  const exports = sources
    .map(
      (source) => `export { default as ${source.componentName} } from './${source.componentName}'`,
    )
    .join('\n');
  const prettierConfig = (await resolveConfig(join(OUTPUT_DIR, 'index.ts'))) ?? {};

  return format(`${GENERATED_TAG}\n\n${exports}\n`, { ...prettierConfig, parser: 'typescript' });
};

const readGeneratedFiles = async () => {
  try {
    const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && ['.ts', '.tsx'].includes(extname(entry.name)))
        .map(async (entry) => {
          const filePath = join(OUTPUT_DIR, entry.name);
          const content = await readFile(filePath, 'utf8');
          return content.startsWith(GENERATED_TAG) ? filePath : null;
        }),
    );

    return files.filter(Boolean);
  } catch {
    return [];
  }
};

const readFileOrEmpty = async (filePath) => {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return '';
  }
};

const assertUniqueComponentNames = (sources) => {
  const names = new Set();

  for (const source of sources) {
    if (names.has(source.componentName)) {
      throw new Error(`Duplicate icon component name: ${source.componentName}`);
    }

    names.add(source.componentName);
  }
};

const main = async () => {
  const sources = [
    ...(await readIconSources(CURRENT_COLOR_SOURCE_DIR, false)),
    ...(await readIconSources(PRESERVE_COLOR_SOURCE_DIR, true)),
  ].sort((left, right) => left.componentName.localeCompare(right.componentName));
  assertUniqueComponentNames(sources);

  const expectedFiles = new Map();
  for (const source of sources) {
    expectedFiles.set(
      join(OUTPUT_DIR, `${source.componentName}.tsx`),
      await renderComponent(source),
    );
  }

  if (sources.length > 0) {
    expectedFiles.set(join(OUTPUT_DIR, 'index.ts'), await renderIndex(sources));
  }

  const existingFiles = await readGeneratedFiles();
  const staleFiles = existingFiles.filter((filePath) => !expectedFiles.has(filePath));
  const changedFiles = [];

  for (const [filePath, content] of expectedFiles) {
    if ((await readFileOrEmpty(filePath)) !== content) {
      changedFiles.push(filePath);
    }
  }

  if (CHECK_ONLY) {
    if (changedFiles.length > 0 || staleFiles.length > 0) {
      process.stderr.write(
        ['Icon files are out of date.', ...changedFiles, ...staleFiles].join('\n'),
      );
      process.stderr.write('\nRun `yarn workspace @app/design-system icons:build`.\n');
      process.exitCode = 1;
      return;
    }

    process.stdout.write(`Icon files are up to date. (${sources.length} SVG files)\n`);
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all(staleFiles.map((filePath) => rm(filePath)));
  await Promise.all(
    [...expectedFiles].map(([filePath, content]) => writeFile(filePath, content, 'utf8')),
  );
  process.stdout.write(`Generated ${sources.length} icon components.\n`);
};

await main();

import { transform } from '@svgr/core';
import jsxPlugin from '@svgr/plugin-jsx';
import svgoPlugin from '@svgr/plugin-svgo';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const GENERATED_TAG = '// @generated — run `yarn icons:build` to update';
const ICON_ROOT = resolve(import.meta.dirname, '../src/icons');
const ICON_SIZES = { small: 16, medium: 20, large: 24 };

const svgrPlugins = [svgoPlugin, jsxPlugin];
const UNSAFE_TAG_PATTERN =
  /<\s*(?:[\w-]+:)?(?:script|foreignObject|iframe|object|embed|link|animate\w*|set)\b/i;
const UNSAFE_EVENT_ATTR_PATTERN = /\son[a-z][\w:-]*\s*=/i;
const UNSAFE_EXTERNAL_HREF_PATTERN = /(?:href|xlink:href)\s*=\s*["']\s*(?!#)[^"']+/i;
const UNSAFE_JAVASCRIPT_URL_PATTERN =
  /(?:href|xlink:href)\s*=\s*["']\s*(?:java\s*script|data)\s*:/i;
const UNSAFE_CSS_REFERENCE_PATTERN = /(?:@import|url\s*\(\s*["']?\s*(?!#|data:)[^)"']+)/i;
const UNSAFE_XML_PATTERN = /<!\s*(?:doctype|entity)\b|<\?xml-stylesheet\b/i;

const notFound = (error) => error && typeof error === 'object' && error.code === 'ENOENT';

export const assertSafeSvg = (svg, fileName) => {
  const violations = [];

  if (UNSAFE_TAG_PATTERN.test(svg)) violations.push('위험한 포함 태그');
  if (UNSAFE_EVENT_ATTR_PATTERN.test(svg)) violations.push('on* 이벤트 속성');
  if (UNSAFE_JAVASCRIPT_URL_PATTERN.test(svg)) violations.push('javascript:/data: URL');
  if (UNSAFE_EXTERNAL_HREF_PATTERN.test(svg)) violations.push('외부 href/xlink:href');
  if (UNSAFE_CSS_REFERENCE_PATTERN.test(svg)) violations.push('외부 CSS 참조');
  if (UNSAFE_XML_PATTERN.test(svg)) violations.push('DTD/entity/XML stylesheet');

  if (violations.length > 0) {
    throw new Error(`안전하지 않은 SVG(${fileName}): ${violations.join(', ')}`);
  }
};

const getRootAttribute = (svg, name) => {
  const rootTag = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!rootTag) throw new Error('루트 svg 태그가 없습니다.');

  return rootTag.match(new RegExp(`(?<![\\w-])${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];
};

export const assertIconDimensions = (svg, fileName) => {
  const width = getRootAttribute(svg, 'width');
  const height = getRootAttribute(svg, 'height');
  const viewBox = getRootAttribute(svg, 'viewBox');
  const expectedSize = Object.entries(ICON_SIZES).find(([size]) =>
    fileName.toLowerCase().includes(`-${size}.svg`),
  )?.[1];

  if (!width || !height || !viewBox) {
    throw new Error(`아이콘 크기 또는 viewBox가 없습니다: ${fileName}`);
  }

  if (!expectedSize || Number(width) !== expectedSize || Number(height) !== expectedSize) {
    throw new Error(`파일명과 SVG 크기가 맞지 않습니다: ${fileName}`);
  }
};

export const toPascalCase = (value) =>
  value
    .replace(/(^|[-_\s]+)([a-zA-Z0-9])/g, (_, separator, character) =>
      `${separator}${character}`.toUpperCase().replace(separator, ''),
    )
    .replace(/[^a-zA-Z0-9]/g, '');

export const toComponentName = (fileName) => {
  const pascalName = toPascalCase(basename(fileName, extname(fileName)));

  if (!pascalName || /^\d/.test(pascalName)) {
    throw new Error(`유효하지 않은 아이콘 파일 이름: ${fileName}`);
  }

  return /(Icon|Logo|Brand|Symbol|Wordmark)$/.test(pascalName) ? pascalName : `${pascalName}Icon`;
};

const stripMetadata = (svg) => svg.replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata\s*>/gi, '');

export const normalizeToCurrentColor = (svg) =>
  stripMetadata(svg)
    .replace(
      /\s(fill|stroke)=["'](?!none|currentColor|transparent|inherit|url\(#)[^"']+["']/gi,
      ' $1="currentColor"',
    )
    .replace(/\sstyle=["'][^"']*["']/gi, '');

const normalizePreservedSvg = (svg) => stripMetadata(svg).replace(/\sstyle=["'][^"']*["']/gi, '');

export const readIconSources = async (sourceDir, preserveColors, rootDir = sourceDir) => {
  let entries;
  try {
    entries = await readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (notFound(error)) return [];
    throw error;
  }

  const files = entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.svg')
    .map((entry) => ({
      componentName: toComponentName(entry.name),
      fileName: relative(rootDir, join(sourceDir, entry.name)),
      filePath: join(sourceDir, entry.name),
      preserveColors,
    }));
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readIconSources(join(sourceDir, entry.name), preserveColors, rootDir)),
  );

  return [...files, ...nested.flat()];
};

export const assertUniqueComponentNames = (sources) => {
  const names = new Set();
  for (const source of sources) {
    if (names.has(source.componentName)) {
      throw new Error(`중복된 아이콘 컴포넌트 이름: ${source.componentName}`);
    }
    names.add(source.componentName);
  }
};

const componentTemplate = ({ componentName, jsx }, { tpl }) => tpl`
  import type { ComponentProps } from 'react';

  const ${componentName} = ({
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    ...props
  }: ComponentProps<'svg'>) => {
    const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());

    return ${jsx};
  };

  export default ${componentName};
`;

const renderComponent = async (source, outputDir) => {
  const rawSvg = await readFile(source.filePath, 'utf8');
  assertSafeSvg(rawSvg, source.fileName);
  assertIconDimensions(rawSvg, source.fileName);
  const svg = source.preserveColors
    ? normalizePreservedSvg(rawSvg)
    : normalizeToCurrentColor(rawSvg);
  const componentCode = await transform(
    svg,
    {
      dimensions: true,
      expandProps: 'end',
      jsxRuntime: 'automatic',
      plugins: svgrPlugins,
      prettier: false,
      svgProps: {
        'aria-hidden': '{hasAccessibleName ? undefined : true}',
        'aria-label': '{ariaLabel}',
        'aria-labelledby': '{ariaLabelledby}',
        focusable: '{false}',
        role: '{hasAccessibleName ? "img" : undefined}',
      },
      svgo: true,
      svgoConfig: {
        plugins: [
          { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
          { name: 'prefixIds', params: { prefix: source.componentName } },
        ],
      },
      template: componentTemplate,
      typescript: true,
    },
    { componentName: source.componentName },
  );
  const prettierConfig =
    (await resolveConfig(join(outputDir, `${source.componentName}.tsx`))) ?? {};

  return format(`${GENERATED_TAG}\n${componentCode}`, { ...prettierConfig, parser: 'typescript' });
};

const readGeneratedFiles = async (outputDir) => {
  let entries;
  try {
    entries = await readdir(outputDir, { withFileTypes: true });
  } catch (error) {
    if (notFound(error)) return [];
    throw error;
  }

  return (
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && extname(entry.name) === '.tsx')
        .map(async (entry) => {
          const filePath = join(outputDir, entry.name);
          return (await readFile(filePath, 'utf8')).startsWith(GENERATED_TAG) ? filePath : null;
        }),
    )
  ).filter(Boolean);
};

const readFileOrEmpty = async (filePath) => {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (notFound(error)) return '';
    throw error;
  }
};

export const generateIcons = async ({
  check = false,
  iconRoot = ICON_ROOT,
  outputDir = join(iconRoot, 'generated'),
} = {}) => {
  const sources = [
    ...(await readIconSources(join(iconRoot, 'svg'), false)),
    ...(await readIconSources(join(iconRoot, 'svg-preserve'), true)),
  ].sort((left, right) => left.componentName.localeCompare(right.componentName));
  assertUniqueComponentNames(sources);

  const expectedFiles = new Map();
  for (const source of sources) {
    expectedFiles.set(
      join(outputDir, `${source.componentName}.tsx`),
      await renderComponent(source, outputDir),
    );
  }

  const existingFiles = await readGeneratedFiles(outputDir);
  const staleFiles = existingFiles.filter((filePath) => !expectedFiles.has(filePath));
  const changedFiles = [];
  for (const [filePath, content] of expectedFiles) {
    if ((await readFileOrEmpty(filePath)) !== content) changedFiles.push(filePath);
  }

  if (!check) {
    await mkdir(outputDir, { recursive: true });
    await Promise.all(staleFiles.map((filePath) => rm(filePath)));
    await Promise.all(
      [...expectedFiles].map(([filePath, content]) => writeFile(filePath, content, 'utf8')),
    );
  }

  return { changedFiles, sources, staleFiles };
};

const main = async () => {
  const check = process.argv.includes('--check');
  const { changedFiles, sources, staleFiles } = await generateIcons({ check });

  if (check) {
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

  process.stdout.write(`Generated ${sources.length} icon components.\n`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

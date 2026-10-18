import { transform } from '@svgr/core';
import jsxPlugin from '@svgr/plugin-jsx';
import svgoPlugin from '@svgr/plugin-svgo';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const GENERATED_TAG = '// @generated — run `yarn icons:build` to update';
const ICON_ROOT = resolve(import.meta.dirname, '../src/icons');
const ICON_SIZES = { small: 16, medium: 20, large: 24 };
const SIZED_FILE_PATTERN = /^(.+)-(small|medium|large)\.svg$/i;

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

// 그래픽 아이콘은 크기가 하나뿐이라 파일명이 아니라 SVG 자체의 정사각형 크기와 viewBox 일치만 확인한다.
export const assertGraphicDimensions = (svg, fileName) => {
  const width = Number(getRootAttribute(svg, 'width'));
  const height = Number(getRootAttribute(svg, 'height'));
  const viewBox = getRootAttribute(svg, 'viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);

  if (!(width > 0) || width !== height) {
    throw new Error(`그래픽 아이콘은 width와 height가 같은 양수여야 합니다: ${fileName}`);
  }
  if (
    !viewBox ||
    viewBox.length !== 4 ||
    viewBox[0] !== 0 ||
    viewBox[1] !== 0 ||
    viewBox[2] !== width ||
    viewBox[3] !== height
  ) {
    throw new Error(`그래픽 아이콘의 viewBox가 width·height와 맞지 않습니다: ${fileName}`);
  }
};

export const toPascalCase = (value) =>
  value
    .replace(/(^|[-_\s]+)([a-zA-Z0-9])/g, (_, separator, character) =>
      `${separator}${character}`.toUpperCase().replace(separator, ''),
    )
    .replace(/[^a-zA-Z0-9]/g, '');

export const toComponentName = (baseName) => {
  const pascalName = toPascalCase(baseName);

  if (!pascalName || /^\d/.test(pascalName)) {
    throw new Error(`유효하지 않은 아이콘 이름: ${baseName}`);
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
    .map((entry) => {
      const match = SIZED_FILE_PATTERN.exec(entry.name);
      if (!match) {
        throw new Error(
          `아이콘 파일 이름은 <이름>-small|medium|large.svg 형식이어야 합니다: ${entry.name}`,
        );
      }

      return {
        baseName: match[1].toLowerCase(),
        fileName: relative(rootDir, join(sourceDir, entry.name)),
        filePath: join(sourceDir, entry.name),
        preserveColors,
        sizeName: match[2].toLowerCase(),
      };
    });
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readIconSources(join(sourceDir, entry.name), preserveColors, rootDir)),
  );

  return [...files, ...nested.flat()];
};

const GRAPHIC_FILE_PATTERN = /^(graphic-.+)\.svg$/i;

// 크기가 하나뿐인 컬러 그래픽 아이콘 원본. 파일명은 graphic-<이름>.svg다.
export const readGraphicSources = async (sourceDir) => {
  let entries;
  try {
    entries = await readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (notFound(error)) return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.svg')
    .map((entry) => {
      const match = GRAPHIC_FILE_PATTERN.exec(entry.name);
      if (!match) {
        throw new Error(
          `그래픽 아이콘 파일 이름은 graphic-<이름>.svg 형식이어야 합니다: ${entry.name}`,
        );
      }

      return {
        baseName: match[1].toLowerCase(),
        componentName: toComponentName(match[1].toLowerCase()),
        fileName: relative(sourceDir, join(sourceDir, entry.name)),
        filePath: join(sourceDir, entry.name),
      };
    });
};

// 같은 이름의 SVG 세 개(small·medium·large)를 아이콘 하나로 묶는다. 하나라도 없으면 크기 prop이 일부만 가능해지므로 실패시킨다.
export const groupIconSources = (sources) => {
  const groups = new Map();
  for (const source of sources) {
    const key = `${source.preserveColors}:${source.baseName}`;
    const group = groups.get(key) ?? {
      baseName: source.baseName,
      componentName: toComponentName(source.baseName),
      files: {},
      preserveColors: source.preserveColors,
    };
    if (group.files[source.sizeName]) {
      throw new Error(`같은 크기의 아이콘이 두 개입니다: ${source.fileName}`);
    }
    group.files[source.sizeName] = source;
    groups.set(key, group);
  }

  const icons = [...groups.values()];
  for (const icon of icons) {
    const missing = Object.keys(ICON_SIZES).filter((sizeName) => !icon.files[sizeName]);
    if (missing.length > 0) {
      throw new Error(`아이콘 크기가 빠졌습니다: ${icon.baseName}(${missing.join(', ')} 없음)`);
    }
  }

  return icons;
};

const sizedName = (name, size) =>
  name.endsWith('Icon') ? `${name.slice(0, -4)}${size}Icon` : `${name}${size}`;

export const assertUniqueComponentNames = (icons, graphicIcons = []) => {
  const names = new Set();
  for (const componentName of [
    ...icons.flatMap((icon) => [
      icon.componentName,
      ...['Small', 'Medium', 'Large'].map((size) => sizedName(icon.componentName, size)),
    ]),
    ...graphicIcons.map((icon) => icon.componentName),
  ]) {
    if (names.has(componentName)) {
      throw new Error(`중복된 아이콘 컴포넌트 이름: ${componentName}`);
    }
    names.add(componentName);
  }
};

// 크기별 도형(viewBox·선 굵기 포함)을 그대로 담은 내부 컴포넌트. 접근성 속성은 바깥 래퍼가 한 번만 붙인다.
const sizeTemplate = ({ componentName, jsx }, { tpl }) => tpl`
  const ${componentName} = (props: ComponentProps<'svg'>) => ${jsx};
`;

const transformSvg = (svg, prefix, innerName) =>
  transform(
    svg,
    {
      dimensions: true,
      expandProps: 'end',
      jsxRuntime: 'automatic',
      plugins: svgrPlugins,
      prettier: false,
      svgo: true,
      svgoConfig: {
        plugins: [
          { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
          { name: 'prefixIds', params: { prefix } },
        ],
      },
      template: sizeTemplate,
      typescript: true,
    },
    { componentName: innerName },
  );

const renderSize = async (source, icon, sizeName) => {
  const rawSvg = await readFile(source.filePath, 'utf8');
  assertSafeSvg(rawSvg, source.fileName);
  assertIconDimensions(rawSvg, source.fileName);
  const svg = source.preserveColors
    ? normalizePreservedSvg(rawSvg)
    : normalizeToCurrentColor(rawSvg);
  const innerName = sizeName[0].toUpperCase() + sizeName.slice(1);

  return transformSvg(svg, `${icon.componentName}${innerName}`, innerName);
};

// 접근성 속성은 바깥 래퍼가 한 번만 붙인다.
const fixedComponentCode = async ({ innerName, name, outputDir, shapeCode }) => {
  const code = `${GENERATED_TAG}
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

${shapeCode}

const ${name} = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <${innerName}
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default ${name};
`;
  const prettierConfig = (await resolveConfig(join(outputDir, `${name}.tsx`))) ?? {};
  return format(code, { ...prettierConfig, parser: 'typescript' });
};

const renderFixedComponent = async (icon, outputDir, sizeName) => {
  const innerName = sizeName[0].toUpperCase() + sizeName.slice(1);
  return fixedComponentCode({
    innerName,
    name: sizedName(icon.componentName, innerName),
    outputDir,
    shapeCode: await renderSize(icon.files[sizeName], icon, sizeName),
  });
};

// 원본 색을 유지하고 크기가 하나뿐인 컬러 그래픽 아이콘
const renderGraphicComponent = async (source, outputDir) => {
  const rawSvg = await readFile(source.filePath, 'utf8');
  assertSafeSvg(rawSvg, source.fileName);
  assertGraphicDimensions(rawSvg, source.fileName);

  return fixedComponentCode({
    innerName: 'Shape',
    name: source.componentName,
    outputDir,
    shapeCode: await transformSvg(normalizePreservedSvg(rawSvg), source.componentName, 'Shape'),
  });
};

const renderComponent = async (icon, outputDir) => {
  const code = `${GENERATED_TAG}
import type { IconProps } from '../types';
import Large from './${sizedName(icon.componentName, 'Large')}';
import Medium from './${sizedName(icon.componentName, 'Medium')}';
import Small from './${sizedName(icon.componentName, 'Small')}';

const SIZES = { sm: Small, md: Medium, lg: Large };
const ${icon.componentName} = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default ${icon.componentName};
`;
  const prettierConfig = (await resolveConfig(join(outputDir, `${icon.componentName}.tsx`))) ?? {};
  return format(code, { ...prettierConfig, parser: 'typescript' });
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
  ];
  const icons = groupIconSources(sources).sort((left, right) =>
    left.componentName.localeCompare(right.componentName),
  );
  const graphicSources = await readGraphicSources(join(iconRoot, 'svg-graphic'));
  assertUniqueComponentNames(icons, graphicSources);

  const expectedFiles = new Map();
  for (const icon of icons) {
    for (const sizeName of Object.keys(ICON_SIZES)) {
      const label = sizeName[0].toUpperCase() + sizeName.slice(1);
      expectedFiles.set(
        join(outputDir, `${sizedName(icon.componentName, label)}.tsx`),
        await renderFixedComponent(icon, outputDir, sizeName),
      );
    }
    expectedFiles.set(
      join(outputDir, `${icon.componentName}.tsx`),
      await renderComponent(icon, outputDir),
    );
  }

  for (const source of graphicSources) {
    expectedFiles.set(
      join(outputDir, `${source.componentName}.tsx`),
      await renderGraphicComponent(source, outputDir),
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

  return { changedFiles, graphicSources, icons, sources, staleFiles };
};

const main = async () => {
  const check = process.argv.includes('--check');
  const { changedFiles, graphicSources, icons, sources, staleFiles } = await generateIcons({
    check,
  });

  if (check) {
    if (changedFiles.length > 0 || staleFiles.length > 0) {
      process.stderr.write(
        ['Icon files are out of date.', ...changedFiles, ...staleFiles].join('\n'),
      );
      process.stderr.write('\nRun `yarn workspace @app/design-system icons:build`.\n');
      process.exitCode = 1;
      return;
    }
    process.stdout.write(
      `Icon files are up to date. (${icons.length} icons, ${sources.length} SVG files, ${graphicSources.length} graphic icons)\n`,
    );
    return;
  }

  process.stdout.write(
    `Generated ${icons.length} icon components from ${sources.length} SVG files and ${graphicSources.length} graphic icons.\n`,
  );
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

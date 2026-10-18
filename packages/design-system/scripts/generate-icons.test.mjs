import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertSafeSvg,
  generateIcons,
  normalizeToCurrentColor,
  toComponentName,
} from './generate-icons.mjs';

const temporaryDirectories = [];
const SIZES = { small: 16, medium: 20, large: 24 };

const svg = (size = 16, body = '<path fill="#121212" d="M0 0h1v1H0z"/>') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const fixture = async () => {
  const iconRoot = await mkdtemp(join(tmpdir(), 'bunch-icons-'));
  temporaryDirectories.push(iconRoot);
  return iconRoot;
};

const writeIcon = async (iconRoot, directory, name, content) => {
  const sourceDir = join(iconRoot, directory);
  await mkdir(sourceDir, { recursive: true });
  await writeFile(join(sourceDir, name), content);
};

// 아이콘 하나는 small·medium·large SVG 세 개로 이루어진다.
const writeIconSet = async (iconRoot, directory, baseName, body) => {
  for (const [sizeName, size] of Object.entries(SIZES)) {
    await writeIcon(iconRoot, directory, `${baseName}-${sizeName}.svg`, svg(size, body));
  }
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('icon generator', () => {
  it.each([
    '<script>alert(1)</script>',
    '<path onclick="alert(1)" />',
    '<use href="https://example.com/icon.svg#icon" />',
    '<style>@import "https://example.com/icon.css";</style>',
    '<!DOCTYPE svg>',
    '<svg:script>alert(1)</svg:script>',
    '<animate attributeName="href" values="javascript:alert(1)" />',
    '<set attributeName="onclick" to="alert(1)" />',
  ])('rejects unsafe SVG input: %s', (unsafeContent) => {
    expect(() => assertSafeSvg(`<svg>${unsafeContent}</svg>`, 'unsafe.svg')).toThrow(
      '안전하지 않은 SVG',
    );
  });

  it('uses currentColor for monochrome icons and preserves color assets', async () => {
    const iconRoot = await fixture();
    await writeIconSet(iconRoot, 'svg', 'line-search');
    await writeIconSet(
      iconRoot,
      'svg-preserve',
      'color-dot',
      '<path fill="#ff0000" d="M0 0h1v1H0z"/>',
    );

    await generateIcons({ iconRoot });

    const monochrome = await readFile(
      join(iconRoot, 'generated', 'LineSearchMediumIcon.tsx'),
      'utf8',
    );
    const preserved = await readFile(join(iconRoot, 'generated', 'ColorDotMediumIcon.tsx'), 'utf8');
    expect(monochrome).toContain('fill="currentColor"');
    expect(preserved).toContain('fill="red"');
    expect(preserved).not.toContain('fill="currentColor"');
    expect(monochrome).toMatch(/ComponentProps<["']svg["']>/);
    expect(monochrome).toContain('{...props}');
  });

  it('separates fixed size modules from the runtime size selector', async () => {
    const iconRoot = await fixture();
    await writeIconSet(iconRoot, 'svg', 'line-search');
    await generateIcons({ iconRoot });
    const code = await readFile(join(iconRoot, 'generated', 'LineSearchIcon.tsx'), 'utf8');
    expect(code).toMatch(/size = ['"]md['"]/);
    expect(code).toMatch(/from ['"]\.\/LineSearchMediumIcon['"]/);
    expect(code).not.toContain('<svg');
    for (const [label, pixels] of [
      ['Small', 16],
      ['Medium', 20],
      ['Large', 24],
    ]) {
      const fixed = await readFile(
        join(iconRoot, 'generated', `LineSearch${label}Icon.tsx`),
        'utf8',
      );
      expect(fixed).toContain(`width={${pixels}}`);
      expect(fixed).toContain(`viewBox="0 0 ${pixels} ${pixels}"`);
      expect(fixed).not.toContain('SIZES');
      expect(fixed).not.toMatch(/import (?!type).* from ['"]\.\//);
    }
  });

  it('keeps the stroke width each size was drawn with', async () => {
    const iconRoot = await fixture();
    const stroke = (width) => `<path stroke="#121212" stroke-width="${width}" d="M0 0h1v1H0z"/>`;
    await writeIcon(iconRoot, 'svg', 'line-add-small.svg', svg(16, stroke('1.2')));
    await writeIcon(iconRoot, 'svg', 'line-add-medium.svg', svg(20, stroke('1.5')));
    await writeIcon(iconRoot, 'svg', 'line-add-large.svg', svg(24, stroke('1.5')));

    await generateIcons({ iconRoot });

    for (const [label, width] of [
      ['Small', '1.2'],
      ['Medium', '1.5'],
      ['Large', '1.5'],
    ]) {
      const code = await readFile(join(iconRoot, 'generated', `LineAdd${label}Icon.tsx`), 'utf8');
      expect(code).toContain(`strokeWidth={${width}}`);
    }
  });

  it('puts the accessibility contract on the outer component once', async () => {
    const iconRoot = await fixture();
    await writeIconSet(iconRoot, 'svg', 'line-search');

    await generateIcons({ iconRoot });

    const code = await readFile(join(iconRoot, 'generated', 'LineSearchMediumIcon.tsx'), 'utf8');
    expect(code).toContain('ariaLabel?.trim() || ariaLabelledby?.trim()');
    expect(code.match(/aria-hidden=\{hasAccessibleName \? undefined : true\}/g)).toHaveLength(1);
    expect(code.match(/focusable=\{false\}/g)).toHaveLength(1);
    expect(code).toMatch(/role=\{hasAccessibleName \? ['"]img['"] : undefined\}/);
  });

  it('fails when one of the three sizes is missing', async () => {
    const iconRoot = await fixture();
    await writeIcon(iconRoot, 'svg', 'line-search-small.svg', svg(16));
    await writeIcon(iconRoot, 'svg', 'line-search-medium.svg', svg(20));

    await expect(generateIcons({ iconRoot })).rejects.toThrow(
      '아이콘 크기가 빠졌습니다: line-search(large 없음)',
    );
  });

  it('rejects file names that do not end with a size', async () => {
    const iconRoot = await fixture();
    await writeIcon(iconRoot, 'svg', 'line-search.svg', svg(16));

    await expect(generateIcons({ iconRoot })).rejects.toThrow('<이름>-small|medium|large.svg');
  });

  it('detects generated drift and stale files without modifying output in check mode', async () => {
    const iconRoot = await fixture();
    await writeIconSet(iconRoot, 'svg', 'line-search');
    await generateIcons({ iconRoot });
    const generatedPath = join(iconRoot, 'generated', 'LineSearchMediumIcon.tsx');
    await writeFile(generatedPath, '// changed');
    await writeFile(
      join(iconRoot, 'generated', 'StaleIcon.tsx'),
      '// @generated — run `yarn icons:build` to update\n',
    );

    const result = await generateIcons({ check: true, iconRoot });

    expect(result.changedFiles).toContain(generatedPath);
    expect(result.staleFiles).toContain(join(iconRoot, 'generated', 'StaleIcon.tsx'));
    expect(await readFile(generatedPath, 'utf8')).toBe('// changed');
  });

  it('rejects collisions after filename normalization', async () => {
    const iconRoot = await fixture();
    await writeIconSet(iconRoot, 'svg', 'line-search');
    await writeIconSet(iconRoot, 'svg-preserve', 'line_search');

    await expect(generateIcons({ iconRoot })).rejects.toThrow('중복된 아이콘 컴포넌트 이름');
  });

  it('rejects a fixed export colliding with another icon name', async () => {
    const iconRoot = await fixture();
    await writeIconSet(iconRoot, 'svg', 'line-search');
    await writeIconSet(iconRoot, 'svg', 'line-search-medium');
    await expect(generateIcons({ iconRoot })).rejects.toThrow('중복된 아이콘 컴포넌트 이름');
  });

  it('generates a single fixed-size graphic icon that keeps its original colors', async () => {
    const iconRoot = await fixture();
    await writeIcon(
      iconRoot,
      'svg-graphic',
      'graphic-lock.svg',
      svg(34, '<path fill="#A7ADFF" d="M0 0h1v1H0z"/>'),
    );

    const result = await generateIcons({ iconRoot });

    expect(result.graphicSources.map((source) => source.componentName)).toEqual([
      'GraphicLockIcon',
    ]);
    const code = await readFile(join(iconRoot, 'generated', 'GraphicLockIcon.tsx'), 'utf8');
    expect(code).toContain('#A7ADFF');
    expect(code).not.toContain('currentColor');
    expect(code).toContain('width={34}');
    expect(code).toContain('ariaLabel?.trim() || ariaLabelledby?.trim()');
  });

  it.each([
    ['lock.svg', svg(34), '그래픽 아이콘 파일 이름은 graphic-<이름>.svg'],
    [
      'graphic-lock.svg',
      '<svg width="34" height="30" viewBox="0 0 34 30" xmlns="http://www.w3.org/2000/svg"/>',
      'width와 height가 같은 양수',
    ],
    [
      'graphic-lock.svg',
      '<svg width="34" height="34" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"/>',
      'viewBox가 width·height와 맞지 않습니다',
    ],
    [
      'graphic-lock.svg',
      '<svg width="34" height="34" viewBox="10 10 34 34" xmlns="http://www.w3.org/2000/svg"/>',
      'viewBox가 width·height와 맞지 않습니다',
    ],
    [
      'graphic-lock.svg',
      `<svg width="34" height="34" viewBox="0 0 34 34"><script/></svg>`,
      '안전하지 않은 SVG',
    ],
  ])('rejects invalid graphic icon %s', async (name, content, message) => {
    const iconRoot = await fixture();
    await writeIcon(iconRoot, 'svg-graphic', name, content);

    await expect(generateIcons({ iconRoot })).rejects.toThrow(message);
  });

  it('rejects a graphic icon colliding with another icon name', async () => {
    const iconRoot = await fixture();
    await writeIconSet(iconRoot, 'svg', 'graphic-lock');
    await writeIcon(iconRoot, 'svg-graphic', 'graphic-lock.svg', svg(34));

    await expect(generateIcons({ iconRoot })).rejects.toThrow('중복된 아이콘 컴포넌트 이름');
  });

  it('normalizes names and removes metadata without erasing dimensions', () => {
    expect(toComponentName('line-search')).toBe('LineSearchIcon');
    expect(normalizeToCurrentColor(`${svg()}<metadata>author</metadata>`)).toContain(
      'currentColor',
    );
    expect(normalizeToCurrentColor(svg())).toContain('width="16"');
  });
});

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
    await writeIcon(iconRoot, 'svg', 'line-search-small.svg', svg());
    await writeIcon(
      iconRoot,
      'svg-preserve',
      'brand-small.svg',
      svg(16, '<path fill="#ff0000" d="M0 0h1v1H0z"/>'),
    );

    await generateIcons({ iconRoot });

    const monochrome = await readFile(
      join(iconRoot, 'generated', 'LineSearchSmallIcon.tsx'),
      'utf8',
    );
    const preserved = await readFile(join(iconRoot, 'generated', 'BrandSmallIcon.tsx'), 'utf8');
    expect(monochrome).toContain('fill="currentColor"');
    expect(preserved).toContain('fill="red"');
    expect(preserved).not.toContain('fill="currentColor"');
    expect(monochrome).toContain('width={16}');
    expect(monochrome).toMatch(/ComponentProps<["']svg["']>/);
    expect(monochrome).toContain('{...props}');
    expect(monochrome).toContain('ariaLabel?.trim() || ariaLabelledby?.trim()');
    expect(monochrome).toContain('aria-hidden={hasAccessibleName ? undefined : true}');
    expect(monochrome).toContain('focusable={false}');
  });

  it('detects duplicate names and generated drift without modifying output in check mode', async () => {
    const iconRoot = await fixture();
    await writeIcon(iconRoot, 'svg', 'line-search-small.svg', svg());
    await generateIcons({ iconRoot });
    const generatedPath = join(iconRoot, 'generated', 'LineSearchSmallIcon.tsx');
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
    await writeIcon(iconRoot, 'svg', 'line-search-small.svg', svg());
    await writeIcon(iconRoot, 'svg-preserve', 'line_search_small.svg', svg());

    await expect(generateIcons({ iconRoot })).rejects.toThrow('중복된 아이콘 컴포넌트 이름');
  });

  it('normalizes names and removes metadata without erasing dimensions', () => {
    expect(toComponentName('line-search-small.svg')).toBe('LineSearchSmallIcon');
    expect(normalizeToCurrentColor(`${svg()}<metadata>author</metadata>`)).toContain(
      'currentColor',
    );
    expect(normalizeToCurrentColor(svg())).toContain('width="16"');
  });
});

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

const bundle = async (source) => {
  const directory = await mkdtemp(join(tmpdir(), 'bunch-icon-bundle-test-'));
  const entry = join(directory, 'entry.tsx');
  await writeFile(entry, source);
  try {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        minify: true,
        lib: { entry, formats: ['es'] },
        rollupOptions: { external: (id) => /^react(?:-dom)?(?:\/|$)/.test(id) },
      },
    });
    return (Array.isArray(result) ? result[0] : result).output;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

describe('icon public barrel bundle', () => {
  it('keeps only the selected geometry and removes unused component dependencies', async () => {
    const output = await bundle(
      `export { FillUserMediumIcon as User } from '${resolve('src/index.ts')}';`,
    );
    const code = output
      .filter((file) => file.type === 'chunk')
      .map((file) => file.code)
      .join('\n');
    expect(code).toContain('FillUserIconMedium__a');
    expect(code).not.toContain('FillUserIconSmall__a');
    expect(code).not.toContain('FillUserIconLarge__a');
    expect(code).not.toContain('FillBellIcon');
    expect(Buffer.byteLength(code)).toBeLessThan(5000);
  });

  it('preserves explicitly imported token CSS', async () => {
    const output = await bundle(
      `import '${resolve('tokens/tokens.css')}'; export const value = 1;`,
    );
    expect(
      output.some(
        (file) => file.type === 'asset' && file.fileName.endsWith('.css') && file.source.length > 0,
      ),
    ).toBe(true);
  });
});

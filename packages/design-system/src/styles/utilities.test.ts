import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

// utilities.css를 실제 Tailwind로 컴파일해 클래스가 만드는 CSS를 읽음
const cssFor = async (classes: string[]) => {
  const compiler = await compile(`@import 'tailwindcss/utilities';\n@import './utilities.css';`, {
    base: import.meta.dirname,
    loadStylesheet: (id, base) => {
      const file = id.startsWith('tailwindcss') ? require.resolve(`${id}.css`) : resolve(base, id);
      return Promise.resolve({
        path: file,
        base: dirname(file),
        content: readFileSync(file, 'utf8'),
      });
    },
  });
  return compiler.build(classes);
};

describe('press-overlay', () => {
  it('덮개를 숨긴 채 가득 채우고 클릭을 가로채지 않으며 75ms Tailwind ease-out으로 나타난다', async () => {
    const css = await cssFor(['press-overlay']);
    const rule = css.slice(css.indexOf('.press-overlay::before'));

    for (const declaration of [
      'position: absolute',
      'inset: 0',
      'opacity: 0',
      'pointer-events: none',
      'transition-property: opacity',
      'transition-duration: 75ms',
      'transition-timing-function: var(--ease-out)',
    ]) {
      expect(rule).toContain(declaration);
    }
  });

  it('동작 줄이기 설정이면 전환을 끈다', async () => {
    const css = await cssFor(['press-overlay']);

    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*transition-property: none;/,
    );
  });
});

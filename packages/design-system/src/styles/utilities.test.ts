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
  it('덮개를 숨긴 채 가득 채우고 클릭을 가로채지 않으며 Figma 눌림 모션(누를 때·뗄 때 150ms, 7982:51780)으로 바뀐다', async () => {
    const css = await cssFor(['press-overlay']);
    const rule = css.slice(css.indexOf('.press-overlay::before'));

    for (const declaration of [
      'position: absolute',
      'inset: 0',
      'opacity: 0',
      'pointer-events: none',
      'transition-property: opacity',
      'transition-duration: 150ms',
      'transition-timing-function: cubic-bezier(0, 0, 0.15, 1)',
    ]) {
      expect(rule).toContain(declaration);
    }
  });

  it('누를 때도 뗄 때와 같은 시간이고, 누른 채 스크롤하면 꺼진다(#583)', async () => {
    const css = await cssFor(['press-overlay']);

    expect(css).not.toContain(':active::before');
    expect(css).toMatch(
      /:root\[data-touch-scrolling\] \.press-overlay::before \{\s*opacity: 0 !important;/,
    );
  });

  it('동작 줄이기 설정이면 전환을 끈다', async () => {
    const css = await cssFor(['press-overlay']);

    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*transition-property: none;/,
    );
  });
});

describe('press-scale(#583)', () => {
  it('누른 채 스크롤하면 줄어듦을 끈다', async () => {
    const css = await cssFor(['press-scale-large']);

    expect(css).not.toContain('transition-delay');
    expect(css).toMatch(/:root\[data-touch-scrolling\] &:active \{\s*scale: 1 !important;\s*\}/);
  });
});

describe('아이콘 버튼 눌림(Figma 8311:57033)', () => {
  it('버튼은 그대로 두고 안쪽 아이콘만 150ms로 0.917(24px 기준 2px)이 되고 같은 시간에 돌아온다', async () => {
    const css = await cssFor(['press-scale-icon']);

    expect(css).toMatch(
      / svg \{\s*transition:\s*scale 150ms cubic-bezier\(0, 0, 0\.15, 1\),\s*opacity 150ms/,
    );
    expect(css).toMatch(
      /:active:not\(:disabled, \[aria-disabled='true'\]\) svg \{\s*scale: 0\.917;/,
    );
    expect(css).toMatch(
      /:root\[data-touch-scrolling\] \.press-scale-icon:active svg \{\s*scale: 1 !important;\s*opacity: 1 !important;/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.press-scale-icon svg \{\s*transition: none;/,
    );
  });

  it('뒤로 가기(fade)는 배경 없이 누르는 동안 아이콘이 60%로 흐려진다', async () => {
    const css = await cssFor(['press-icon-fade']);

    expect(css).toMatch(/:active:not\([^)]*\]\) svg \{[^}]*opacity: 0\.6;/);
    expect(css).not.toContain('::after');
  });

  it('그 밖의 아이콘 버튼(overlay)은 누르는 동안 아이콘 뒤에 36×36·모서리 8 overlay-hover 배경을 깐다', async () => {
    const css = await cssFor(['press-icon-overlay']);
    // @apply를 쓴 유틸리티라 중첩(&)이 풀리지 않은 채 나옴(앱 빌드에서 풀림)
    const rule = css.slice(css.indexOf('&::after'));

    for (const declaration of [
      'width: var(--spacing-s15)',
      'height: var(--spacing-s15)',
      'translate: -50% -50%',
      'border-radius: var(--radius-r4)',
      'background-color: var(--color-overlay-hover)',
      'opacity: 0',
      'pointer-events: none',
      'z-index: -1',
    ]) {
      expect(rule).toContain(declaration);
    }
    expect(css).toMatch(/&:active:not\([^)]*\]\)::after \{\s*opacity: 1;/);
    expect(css).toMatch(/:root\[data-touch-scrolling\] &::after \{\s*opacity: 0 !important;/);
    expect(css).not.toContain('opacity: 0.6');
  });
});

describe('active 변형(#583)', () => {
  it('누른 채 움직이면(data-touch-scrolling) 눌림 스타일을 끈다', async () => {
    const css = await cssFor([
      'active:opacity-50',
      'group-active:opacity-50',
      'has-[[data-card-button]:active:not(:root[data-touch-scrolling]_*)]:opacity-50',
    ]);

    expect(css).toContain('.active\\:opacity-50:active:not(:where(:root[data-touch-scrolling] *))');
    expect(css).toContain(':where(.group):active:not(:where(:root[data-touch-scrolling] *))');
    expect(css).toContain(
      ':has(:is([data-card-button]:active:not(:root[data-touch-scrolling] *)))',
    );
  });
});

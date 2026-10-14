import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTokenCss } from './tokens';

const token = ($type: string, $value: unknown) => ({ $type, $value });
const fixture = {
  'Primitive/Mode 1': {
    Bunch: { blue: token('color', '#454edf') },
    Dimension: { four: token('number', '4') },
    Opacity: { forty: token('number', '40') },
    Alpha: { white: token('color', 'rgba(#ffffff, {Opacity.forty})') },
  },
  'Semantic/Mode 1': {
    Text: { brand: token('color', '{Bunch.blue}') },
    Radius: { small: token('number', '{Dimension.four}') },
  },
};

describe('design token CSS', () => {
  it('keeps semantic references and converts lengths and alpha to valid CSS', () => {
    const css = buildTokenCss(fixture);
    expect(css).toContain('--primitive-dimension-four: 4px;');
    expect(css).toContain('--semantic-text-brand: var(--primitive-bunch-blue);');
    expect(css).toContain('--radius-small: var(--semantic-radius-small);');
    expect(css).toContain(
      'color-mix(in srgb, #ffffff var(--primitive-opacity-forty), transparent)',
    );
    expect(css).toContain('--primitive-opacity-forty: 40%;');
  });
  it('fails on missing references and cycles', () => {
    expect(() => buildTokenCss({ 'Primitive/Mode 1': { a: token('color', '{missing}') } })).toThrow(
      'Missing token reference',
    );
    expect(() =>
      buildTokenCss({ 'Primitive/Mode 1': { a: token('color', '{b}'), b: token('color', '{a}') } }),
    ).toThrow('Circular token reference');
  });
  it('fails on ambiguous paths, CSS names and unsupported modes', () => {
    expect(() =>
      buildTokenCss({
        'Primitive/Mode 1': { a: token('number', 1) },
        'Semantic/Mode 1': { a: token('number', 2) },
      }),
    ).toThrow('Duplicate token');
    expect(() =>
      buildTokenCss({
        'Primitive/Mode 1': { 'a b': token('number', 1), 'a-b': token('number', 2) },
      }),
    ).toThrow('Duplicate token');
    expect(() => buildTokenCss({ 'Primitive/Mode 2': {} })).toThrow('Unsupported token set');
    expect(() => buildTokenCss({ ...fixture, $themes: [{}] })).toThrow('Theme selection');
  });
  it('converts the actual export with typography, shadow and gradients', () => {
    const raw = JSON.parse(readFileSync('tokens/tokens.json', 'utf8')) as Record<string, unknown>;
    const css = buildTokenCss(raw);
    expect(css).toContain('--semantic-text-primary: var(--primitive-gray-scale-gray-900);');
    expect(css).toContain('@utility typography-title-1-bold');
    expect(css).toContain('line-height: var(--primitive-line-height-31);');
    expect(css).toContain('--primitive-shadow-navi-bar: 0px 0px 24px 0px #00000014;');
    expect(css).toContain('--background-image-primitive-gradient-01:');
    expect(css).not.toMatch(/\{(?:Gray Scale|Dimension|fontSize)\./);
    expect(buildTokenCss(raw)).toBe(css);
  });
  it('removes repeated group prefixes from declarations and every reference', () => {
    const css = buildTokenCss({
      'Primitive/Mode 1': { Bunch: { 'color-primitive-bunch-500': token('color', '#454edf') } },
      'Semantic/Mode 1': {
        Border: { 'border-brand': token('color', '{Bunch.color-primitive-bunch-500}') },
      },
    });
    expect(css).toContain('--primitive-bunch-500: #454edf;');
    expect(css).toContain('--semantic-border-brand: var(--primitive-bunch-500);');
    expect(css).toContain('--color-border-brand: var(--semantic-border-brand);');
    expect(css).not.toContain('border-border-brand');
    expect(() =>
      buildTokenCss({
        'Primitive/Mode 1': { A: { 'a-b': token('number', 1), b: token('number', 2) } },
      }),
    ).toThrow('Duplicate token');
  });
});

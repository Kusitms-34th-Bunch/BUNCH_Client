import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cn, tv } from './tailwind';

const tokensCss = readFileSync(resolve(import.meta.dirname, '../../tokens/tokens.css'), 'utf8');

const namesOf = (pattern: RegExp, expectedCount: number) => {
  const names = [...tokensCss.matchAll(pattern)].map((match) => match[1]!);

  // 포맷 변경 시 it.each가 빈 채 통과하는 것 방지(개수 고정)
  if (names.length !== expectedCount) {
    throw new Error(
      `tokens.css에서 ${pattern}을 ${names.length}개 찾았다(기대 ${expectedCount}개). 목록과 정규식을 함께 확인한다.`,
    );
  }

  return names;
};

describe('cn', () => {
  it('joins multiple class strings', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('drops falsy values', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2');
  });

  it('resolves conflicting tailwind utilities by keeping the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('lets a caller override a base class via a conditional', () => {
    expect(cn('text-sm', { 'text-lg': true })).toBe('text-lg');
  });

  it('토큰 클래스도 호출하는 쪽의 기본 scale 클래스가 덮어쓴다', () => {
    expect(cn('h-s18 px-s12 rounded-r4', 'h-10 px-4 rounded-full')).toBe('h-10 px-4 rounded-full');
  });

  it('typography 토큰끼리는 마지막 것만 남긴다', () => {
    expect(cn('typography-label-l', 'typography-label-s')).toBe('typography-label-s');
  });

  it('typography 토큰이 글자색을 지우지 않는다', () => {
    expect(cn('typography-label-l text-text-primary')).toBe('typography-label-l text-text-primary');
  });
});

describe('토큰 이름 목록이 tokens.css와 같다', () => {
  it.each(namesOf(/^ {2}--spacing-([a-z0-9-]+):/gm, 43))('spacing %s', (name) => {
    expect(cn(`h-${name}`, 'h-10')).toBe('h-10');
  });

  it.each(namesOf(/^ {2}--radius-([a-z0-9-]+):/gm, 11))('radius %s', (name) => {
    expect(cn(`rounded-${name}`, 'rounded-none')).toBe('rounded-none');
  });

  it.each(namesOf(/^ {2}--shadow-([a-z0-9-]+):/gm, 1))('shadow %s', (name) => {
    expect(cn(`shadow-${name}`, 'shadow-none')).toBe('shadow-none');
  });

  it.each(namesOf(/^@utility typography-([a-z0-9-]+)/gm, 22))('typography %s', (name) => {
    expect(cn(`typography-${name}`, 'typography-label-s')).toBe('typography-label-s');
  });
});

describe('tv', () => {
  const box = tv({
    base: 'h-s18 px-s12',
    variants: { tone: { dark: 'bg-surface-inversed', light: 'bg-surface-primary' } },
    defaultVariants: { tone: 'dark' },
  });

  it('변형 class를 고른다', () => {
    expect(box({ tone: 'light' })).toBe('h-s18 px-s12 bg-surface-primary');
  });

  it('호출하는 쪽의 className이 토큰 class를 덮어쓴다', () => {
    expect(box({ className: 'h-10' })).toBe('px-s12 bg-surface-inversed h-10');
  });
});

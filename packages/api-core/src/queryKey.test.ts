import { describe, expect, it } from 'vitest';
import { createQueryKeys, normalizeParams } from './queryKey';

describe('normalizeParams', () => {
  it('drops undefined fields', () => {
    expect(normalizeParams({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' });
  });

  it('keeps other falsy values', () => {
    expect(normalizeParams({ a: 0, b: '', c: false })).toEqual({ a: 0, b: '', c: false });
  });
});

describe('createQueryKeys', () => {
  const marketKeys = createQueryKeys('market');

  it('builds a stable root key', () => {
    expect(marketKeys.all).toEqual(['market']);
  });

  it('builds a list parent key', () => {
    expect(marketKeys.lists()).toEqual(['market', 'list']);
  });

  it('builds a list key without params', () => {
    expect(marketKeys.list()).toEqual(['market', 'list']);
  });

  it('builds a list key with normalized params', () => {
    expect(marketKeys.list({ page: 1, size: undefined })).toEqual(['market', 'list', { page: 1 }]);
  });

  it('builds a detail parent key', () => {
    expect(marketKeys.details()).toEqual(['market', 'detail']);
  });

  it('builds a detail key', () => {
    expect(marketKeys.detail(1)).toEqual(['market', 'detail', 1]);
    expect(marketKeys.detail('slug')).toEqual(['market', 'detail', 'slug']);
  });
});

import { describe, expect, it } from 'vitest';
import { parseDraftId, parsePhotoId } from './draftId';

describe('parseDraftId', () => {
  it('영문·숫자·밑줄·하이픈 64자 이하는 그대로 통과시킨다', () => {
    expect(parseDraftId('draft-1')).toBe('draft-1');
    expect(parseDraftId('a'.repeat(64))).toBe('a'.repeat(64));
  });

  it('형식이 틀리면 undefined를 돌려준다', () => {
    expect(parseDraftId('../secret')).toBeUndefined();
    expect(parseDraftId('a'.repeat(65))).toBeUndefined();
    expect(parseDraftId('')).toBeUndefined();
    expect(parseDraftId('초안')).toBeUndefined();
  });
});

describe('parsePhotoId', () => {
  it('초안 id와 같은 규칙으로 검증한다', () => {
    expect(parsePhotoId('draft-photo-1')).toBe('draft-photo-1');
    expect(parsePhotoId('../x')).toBeUndefined();
  });
});

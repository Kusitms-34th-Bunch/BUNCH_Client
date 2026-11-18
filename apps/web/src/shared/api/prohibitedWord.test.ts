import { ApiError } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import { prohibitedFieldsOf } from './prohibitedWord';

const apiError = (code: string, detail: unknown) =>
  new ApiError({
    message: 'error',
    category: 'validation',
    status: 400,
    code,
    data: { success: false, data: null, error: { code, message: 'error', detail } },
  });

describe('prohibitedFieldsOf', () => {
  it('금칙어 거부(COMMON_003)면 걸린 칸 이름을 돌려준다', () => {
    expect(
      prohibitedFieldsOf(apiError('COMMON_003', { fields: ['name', 'introduction'] })),
    ).toEqual(['name', 'introduction']);
  });

  it('금칙어 거부인데 칸 이름을 읽지 못하면 빈 목록을 돌려준다', () => {
    expect(prohibitedFieldsOf(apiError('COMMON_003', null))).toEqual([]);
    expect(prohibitedFieldsOf(apiError('COMMON_003', { fields: [1, 'nickname'] }))).toEqual([
      'nickname',
    ]);
  });

  it('금칙어 거부가 아니면 null을 돌려준다', () => {
    expect(prohibitedFieldsOf(apiError('COMMON_001', { fields: ['name'] }))).toBeNull();
    expect(prohibitedFieldsOf(new Error('network'))).toBeNull();
  });
});

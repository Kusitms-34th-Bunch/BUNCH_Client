import { ApiError } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { readErrorDetail } from './bundleErrors';

const withData = (data: unknown) =>
  new ApiError({ message: 'x', category: 'validation', status: 409, data });
const schema = z.object({ reason: z.enum(['A', 'B']) });

describe('readErrorDetail', () => {
  it('오류 본문의 error.detail을 스키마로 읽는다', () => {
    expect(readErrorDetail(withData({ error: { detail: { reason: 'A' } } }), schema)).toEqual({
      reason: 'A',
    });
  });

  it('본문이 없거나 모양이 다르면 undefined', () => {
    expect(readErrorDetail(withData(undefined), schema)).toBeUndefined();
    expect(readErrorDetail(withData({ error: {} }), schema)).toBeUndefined();
    expect(
      readErrorDetail(withData({ error: { detail: { reason: 'C' } } }), schema),
    ).toBeUndefined();
  });
});

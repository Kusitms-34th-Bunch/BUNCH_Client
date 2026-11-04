import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError } from './error';
import { INVALID_RESPONSE_CODE, parseOrThrow } from './validate';

const schema = z.object({ id: z.number(), name: z.string() });

describe('parseOrThrow', () => {
  it('returns parsed data on success', () => {
    expect(parseOrThrow(schema, { id: 1, name: 'a' })).toEqual({ id: 1, name: 'a' });
  });

  it('throws a validation ApiError with the context and issues in data', () => {
    let thrown: unknown;
    try {
      parseOrThrow(schema, { id: 'not a number' }, 'getUser');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({ category: 'validation', code: INVALID_RESPONSE_CODE });
    const { data } = thrown as ApiError;
    expect(data).toMatchObject({ context: 'getUser' });
    expect((data as { issues: { path: unknown[] }[] }).issues[0]?.path).toEqual(['id']);
  });
});

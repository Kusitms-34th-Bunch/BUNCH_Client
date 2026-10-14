import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { parseResponse } from './validate';

const schema = z.object({ id: z.number(), name: z.string() });

describe('parseResponse', () => {
  it('returns parsed data on success', () => {
    const result = parseResponse(schema, { id: 1, name: 'a' });
    expect(result).toEqual({ id: 1, name: 'a' });
  });

  it('returns undefined and reports on failure', () => {
    const onValidationError = vi.fn();
    const result = parseResponse(
      schema,
      { id: 'not a number' },
      { context: 'getUser', onValidationError },
    );

    expect(result).toBeUndefined();
    expect(onValidationError).toHaveBeenCalledTimes(1);
    expect(onValidationError).toHaveBeenCalledWith(expect.any(z.ZodError), 'getUser');
  });

  it('does not throw when onValidationError is omitted', () => {
    expect(() => parseResponse(schema, {})).not.toThrow();
  });
});

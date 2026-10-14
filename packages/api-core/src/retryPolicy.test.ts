import { describe, expect, it } from 'vitest';
import { ApiError } from './error';
import { createRetryPolicy } from './retryPolicy';

describe('createRetryPolicy', () => {
  const { shouldRetryQuery, shouldThrowQueryError } = createRetryPolicy();

  it('retries a 500 error once', () => {
    const error = new ApiError({ message: 'x', category: 'server', status: 500 });
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);
  });

  it('retries a network error', () => {
    const error = new ApiError({ message: 'x', category: 'network' });
    expect(shouldRetryQuery(0, error)).toBe(true);
  });

  it('does not retry a 400 error', () => {
    const error = new ApiError({ message: 'x', category: 'validation', status: 400 });
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it('does not retry a non-ApiError', () => {
    expect(shouldRetryQuery(0, new Error('x'))).toBe(false);
  });

  it('throws for 500 errors and swallows 4xx', () => {
    expect(
      shouldThrowQueryError(new ApiError({ message: 'x', category: 'server', status: 500 })),
    ).toBe(true);
    expect(
      shouldThrowQueryError(new ApiError({ message: 'x', category: 'validation', status: 400 })),
    ).toBe(false);
  });

  it('respects a custom retry limit', () => {
    const policy = createRetryPolicy(2);
    const error = new ApiError({ message: 'x', category: 'server', status: 500 });
    expect(policy.shouldRetryQuery(1, error)).toBe(true);
    expect(policy.shouldRetryQuery(2, error)).toBe(false);
  });
});

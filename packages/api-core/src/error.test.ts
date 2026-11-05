import { describe, expect, it } from 'vitest';
import { ApiError, isApiError, normalizeError } from './error';

const fakeHttpError = (status: number, data?: unknown) => {
  const error = new Error('Request failed') as Error & {
    name: string;
    response: { status: number };
    data?: unknown;
  };
  error.name = 'HTTPError';
  error.response = { status };
  error.data = data;
  return error;
};

describe('normalizeError', () => {
  it('passes through an existing ApiError unchanged', () => {
    const original = new ApiError({ message: 'boom', category: 'server' });
    expect(normalizeError(original)).toBe(original);
  });

  it('reads code and message from the server envelope error', () => {
    const result = normalizeError(
      fakeHttpError(401, {
        success: false,
        data: null,
        error: { code: 'AUTH_001', message: '인증이 필요합니다', detail: null },
      }),
    );
    expect(result.code).toBe('AUTH_001');
    expect(result.message).toBe('인증이 필요합니다');
  });

  it('maps a 401 HTTPError to the auth category', () => {
    const result = normalizeError(
      fakeHttpError(401, { message: '인증이 필요합니다', code: 'AUTH-001' }),
    );
    expect(result.category).toBe('auth');
    expect(result.status).toBe(401);
    expect(result.code).toBe('AUTH-001');
    expect(result.message).toBe('인증이 필요합니다');
  });

  it('maps a 500 HTTPError to the server category', () => {
    const result = normalizeError(fakeHttpError(500));
    expect(result.category).toBe('server');
  });

  it('maps a 404 HTTPError to the validation category', () => {
    const result = normalizeError(fakeHttpError(404));
    expect(result.category).toBe('validation');
  });

  it('maps a TimeoutError to the network category', () => {
    const error = new Error('Timed out');
    error.name = 'TimeoutError';
    expect(normalizeError(error).category).toBe('network');
  });

  it('falls back to unknown for a plain Error', () => {
    expect(normalizeError(new Error('plain')).category).toBe('unknown');
  });

  it('falls back to unknown for a non-error value', () => {
    expect(normalizeError('not an error').category).toBe('unknown');
  });
});

describe('isApiError', () => {
  it('narrows only ApiError instances', () => {
    expect(isApiError(new ApiError({ message: 'x', category: 'unknown' }))).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
  });
});

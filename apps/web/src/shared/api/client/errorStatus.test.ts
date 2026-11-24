import { ApiError } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import {
  apiErrorCode,
  apiErrorStatus,
  isDefiniteRejection,
  isUnavailableTarget,
} from './errorStatus';

const httpError = (status: number) =>
  new ApiError({ message: 'failed', category: 'validation', status });

describe('isUnavailableTarget', () => {
  it('400·403·404만 볼 수 없음으로 본다', () => {
    expect([400, 403, 404].map((status) => isUnavailableTarget(httpError(status)))).toEqual([
      true,
      true,
      true,
    ]);
    expect([401, 409, 500].map((status) => isUnavailableTarget(httpError(status)))).toEqual([
      false,
      false,
      false,
    ]);
    expect(isUnavailableTarget(new Error('x'))).toBe(false);
  });
});

describe('isDefiniteRejection', () => {
  it('408·429를 뺀 4xx만 확정 거절로 본다', () => {
    expect([400, 403, 404, 409].every((status) => isDefiniteRejection(httpError(status)))).toBe(
      true,
    );
    expect([408, 429, 500, 502].some((status) => isDefiniteRejection(httpError(status)))).toBe(
      false,
    );
    // 응답을 받지 못한 오류(status 없음)는 거절이 아님
    expect(isDefiniteRejection(new ApiError({ message: 'x', category: 'network' }))).toBe(false);
  });
});

describe('apiErrorCode·apiErrorStatus', () => {
  it('API 오류면 서버 코드와 상태를 읽는다', () => {
    const error = new ApiError({
      message: 'x',
      category: 'validation',
      status: 409,
      code: 'BUNDLE_003',
    });
    expect(apiErrorCode(error)).toBe('BUNDLE_003');
    expect(apiErrorStatus(error)).toBe(409);
  });

  it('API 오류가 아니면 code·status가 붙어 있어도 undefined(요청 오류는 모두 ApiError로 바뀜)', () => {
    const plain = Object.assign(new Error('x'), { status: 404, code: 'RESOURCE_001' });
    expect(apiErrorCode(plain)).toBeUndefined();
    expect(apiErrorStatus(plain)).toBeUndefined();
    expect(apiErrorStatus(null)).toBeUndefined();
  });
});

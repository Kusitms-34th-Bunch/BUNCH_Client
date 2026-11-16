import { ApiError, INVALID_RESPONSE_CODE } from '@app/api-core';
import { captureException } from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportApiError, shouldReportApiError } from './reportApiError';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

const apiError = (category: ApiError['category'], status?: number, code?: string) =>
  new ApiError({ message: 'x', category, status, code });

describe('shouldReportApiError', () => {
  it.each([
    ['5xx', apiError('server', 503)],
    ['분류 못 한 오류', apiError('unknown')],
    ['응답 계약 위반', apiError('validation', 200, INVALID_RESPONSE_CODE)],
    ['ApiError가 아닌 코드 결함', new TypeError('boom')],
  ])('%s는 보고한다', (_name, error) => {
    expect(shouldReportApiError(error)).toBe(true);
  });

  it.each([
    ['401', apiError('auth', 401)],
    ['403', apiError('forbidden', 403)],
    ['네트워크', apiError('network')],
    ['업무 4xx', apiError('validation', 400, 'BUNCH_001')],
  ])('%s는 보고하지 않는다', (_name, error) => {
    expect(shouldReportApiError(error)).toBe(false);
  });
});

describe('reportApiError', () => {
  beforeEach(() => vi.mocked(captureException).mockClear());

  it('응답 원문 대신 고정 문구로, 분류·status·code로 묶어 보낸다', () => {
    reportApiError(
      new ApiError({
        message: '닉네임 홍길동 중복',
        category: 'server',
        status: 502,
        code: 'COMMON_502',
      }),
    );
    const [sent, hint] = vi.mocked(captureException).mock.calls[0] ?? [];
    expect((sent as Error).message).toBe('API server 502 COMMON_502');
    expect(hint).toEqual({ fingerprint: ['api-error', 'server', '502', 'COMMON_502'] });
  });

  it('오류 코드 형식이 아닌 code는 묶음 키에 쓰지 않는다', () => {
    reportApiError(apiError('server', 500, 'user 42 failed'));
    const [sent, hint] = vi.mocked(captureException).mock.calls[0] ?? [];
    expect((sent as Error).message).toBe('API server 500 -');
    expect(hint).toEqual({ fingerprint: ['api-error', 'server', '500', '-'] });
  });

  it('ApiError가 아닌 코드 결함은 그대로 보낸다', () => {
    const error = new TypeError('boom');
    reportApiError(error);
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it('보고 대상이 아니면 보내지 않는다', () => {
    reportApiError(apiError('auth', 401));
    expect(captureException).not.toHaveBeenCalled();
  });
});

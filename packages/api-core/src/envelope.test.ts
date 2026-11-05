import { describe, expect, it } from 'vitest';
import { unwrapEnvelope } from './envelope';
import { isApiError } from './error';

describe('unwrapEnvelope', () => {
  it('성공 envelope의 data를 돌려준다', () => {
    expect(unwrapEnvelope({ success: true, data: { id: 1 }, error: null })).toEqual({ id: 1 });
  });

  it('data가 없는 성공 응답은 null을 돌려준다', () => {
    expect(unwrapEnvelope({ success: true, data: null, error: null })).toBeNull();
  });

  it('실패 envelope은 error의 code와 message로 ApiError를 던진다', () => {
    try {
      unwrapEnvelope({
        success: false,
        data: null,
        error: { code: 'AUTH_001', message: '인증 필요' },
      });
      expect.unreachable();
    } catch (error) {
      expect(isApiError(error)).toBe(true);
      expect(error).toMatchObject({ code: 'AUTH_001', message: '인증 필요', category: 'server' });
    }
  });

  it('envelope이 아닌 응답은 형식 오류로 던진다', () => {
    expect(() => unwrapEnvelope({ id: 1 })).toThrow('응답 형식이 올바르지 않습니다.');
  });
});

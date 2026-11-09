import { normalizeError } from '@app/api-core';
import { bffApi } from '@/shared/api/bffApi';

/** 로그아웃(가입 중에도 가능). BFF가 백엔드 세션 폐기를 시도하고 결과와 관계없이 인증 쿠키를 지움(204) */
export const logout = async () => {
  try {
    await bffApi.post('auth/logout');
  } catch (error) {
    throw normalizeError(error);
  }
};

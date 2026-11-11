import { normalizeError } from '@app/api-core';
import { bffApi } from '@/shared/api/bffApi';
import { clearPendingInvitation } from '@/shared/lib/pendingInvitation';

/** 로그아웃(가입 중에도 가능). BFF가 백엔드 세션 폐기를 시도하고 결과와 관계없이 인증 쿠키를 지움(204) */
export const logout = async () => {
  // 로그아웃하면 보관 중이던 초대 정보도 지움(기능명세 1.5.1). 서버 요청이 실패해도 이 기기의 값은 지움
  clearPendingInvitation();
  try {
    await bffApi.post('auth/logout');
  } catch (error) {
    throw normalizeError(error);
  }
};

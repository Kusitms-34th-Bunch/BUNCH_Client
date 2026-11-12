import { normalizeError } from '@app/api-core';
import { clearPendingInvitation } from '../lib/pendingInvitation';
import { releasePushDevice, syncPushDevice } from '../lib/pushDevice';
import { bffApi } from './bffApi';

/**
 * 로그아웃(가입 중에도 가능). BFF가 백엔드 세션 폐기를 시도하고 결과와 관계없이 인증 쿠키를 지움(204)
 * 가입·로그인 화면과 MY가 같은 요청을 써서 공용으로 둠
 */
export const logout = async () => {
  // 로그아웃하면 보관 중이던 초대 정보도 지움(기능명세 1.5.1). 서버 요청이 실패해도 이 기기의 값은 지움
  clearPendingInvitation();
  // 이 기기로 푸시가 가지 않게 서버에서 해제(기능명세 7.5.2 로직 1). 인증이 필요해 세션을 지우기 전에 하고, 실패해도 로그아웃은 계속
  await releasePushDevice();
  try {
    await bffApi.post('auth/logout');
  } catch (error) {
    // 로그아웃이 실패하면 로그인이 유지되므로 방금 해제한 이 기기를 다시 등록(그대로 두면 앱을 벗어났다 돌아올 때까지 푸시가 끊김). 등록 실패는 삼킴
    void syncPushDevice();
    throw normalizeError(error);
  }
};

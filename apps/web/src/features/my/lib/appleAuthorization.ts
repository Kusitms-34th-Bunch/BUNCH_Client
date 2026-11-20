import { appleAuthorizationResultSchema, type AppleAuthorizationResult } from '@app/bridge';
import { isNativeShell, loginBridge } from '@/shared/bridge/client';

/**
 * 탈퇴 전 Apple 재인증(쉘의 Apple 로그인 창). 서버가 Apple 연결을 끊을 일회용 인증 코드를 받음
 * 브라우저·이 메서드가 없는 이전 쉘은 받을 수 없어 실패로 던짐(서버는 코드 없는 Apple 탈퇴를 거절)
 */
export const authorizeApple = async (): Promise<AppleAuthorizationResult> => {
  if (!isNativeShell() || !loginBridge.isNativeMethodAvailable('authorizeApple')) {
    throw new Error('Apple 재인증을 할 수 없는 환경입니다.');
  }
  // 소셜 로그인과 같이 받은 직후 계약으로 다시 확인(코드는 저장하거나 로그에 남기지 않음)
  return appleAuthorizationResultSchema.parse(await loginBridge.authorizeApple());
};

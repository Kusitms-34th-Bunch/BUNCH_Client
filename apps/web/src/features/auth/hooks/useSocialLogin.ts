'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export type SocialProvider = 'kakao' | 'google' | 'apple';
/** 사용자가 소셜 로그인 창을 닫은 경우는 실패가 아니라 `cancelled`로 반환 */
export type SocialLoginResult = 'success' | 'cancelled';
export type SignIn = (_provider: SocialProvider) => Promise<SocialLoginResult>;

export const LOGIN_FAILURE_MESSAGE = '로그인에 실패했어요. 다시 시도해 주세요';

// 기획 명세: 오류 토스트는 하단 버튼 바로 위. 버튼 영역(버튼 3개 160px + 아래 여백 20px)에서 12px 위로 배치(기본 위치는 Safe Area + 16px)
const FAILURE_TOAST_BOTTOM_OFFSET = 176;

export const LOGIN_PENDING_MESSAGE = '로그인하는 중이에요';

/**
 * 소셜 로그인 버튼 3개가 함께 쓰는 진행 상태
 * 하나가 진행 중이면 다른 시도는 무시(연타·동시 로그인 방지), 취소·실패하면 처음 상태로 복귀
 * 성공하면 `nextPath`로 이동하고, 이동할 때까지 잠금 유지(가입 상태에 따른 분기는 인증 BFF 연결 뒤 추가)
 * `signIn`이 없으면(소셜 SDK·인증 BFF 연결 전) 버튼을 눌러도 동작 없음
 */
export function useSocialLogin(signIn: SignIn | undefined, nextPath: string) {
  const router = useRouter();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  // 같은 틱의 연타 방지를 위해 ref로 먼저 잠금(state는 다음 렌더에야 반영)
  const inFlight = useRef(false);

  const login = async (provider: SocialProvider) => {
    if (!signIn || inFlight.current) return;
    inFlight.current = true;
    setPendingProvider(provider);

    let keepLocked = false;
    try {
      keepLocked = (await signIn(provider)) === 'success';
      if (keepLocked) router.push(nextPath);
    } catch {
      toast(LOGIN_FAILURE_MESSAGE, { bottomOffset: FAILURE_TOAST_BOTTOM_OFFSET });
    } finally {
      if (!keepLocked) {
        inFlight.current = false;
        setPendingProvider(null);
      }
    }
  };

  return { pendingProvider, login };
}

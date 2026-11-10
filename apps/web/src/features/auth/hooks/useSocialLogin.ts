'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export type SocialProvider = 'kakao' | 'google' | 'apple';
/** 사용자가 소셜 로그인 창을 닫은 경우는 `cancelled`로 반환(화면에서는 실패와 같은 토스트) */
export type SocialLoginResult = 'success' | 'cancelled';
export type SignIn = (_provider: SocialProvider) => Promise<SocialLoginResult>;

export const LOGIN_FAILURE_MESSAGE = '로그인에 실패했어요. 다시 시도해 주세요';
/** 로그인은 됐지만 가입 상태를 읽지 못해 어디로 보낼지 모를 때(기획 1.1.1의 세션 확인 실패 문구) */
export const STATUS_CHECK_FAILURE_MESSAGE = '일시적인 오류가 발생했어요. 다시 시도해 주세요';

export const LOGIN_PENDING_MESSAGE = '로그인하는 중이에요';

/**
 * 소셜 로그인 버튼 3개가 함께 쓰는 진행 상태
 * 하나가 진행 중이면 다른 시도는 무시(연타·동시 로그인 방지), 취소·실패하면 처음 상태로 복귀
 * 로그인에 성공하면 `resolveNextPath`로 도착 화면(가입 상태에 따라 다름)을 정해 이동하고, 이동할 때까지 잠금 유지
 * 가입 상태를 읽지 못하면 로그인 화면에 머물며 토스트만 보임(이미 로그인된 상태라 다시 누르면 바로 이어짐)
 * `signIn`이 없으면 버튼을 눌러도 동작 없음
 */
export function useSocialLogin(
  signIn: SignIn | undefined,
  resolveNextPath: () => Promise<string | { path: string; replace: boolean }>,
) {
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
      const result = await signIn(provider);
      if (result === 'cancelled') {
        // 기획 1.2.6: 로그인 창을 닫아도 실패와 같은 안내 토스트
        toast(LOGIN_FAILURE_MESSAGE);
      } else {
        let next: string | { path: string; replace: boolean };
        try {
          next = await resolveNextPath();
        } catch {
          toast(STATUS_CHECK_FAILURE_MESSAGE);
          return;
        }
        keepLocked = true;
        const { path, replace } = typeof next === 'string' ? { path: next, replace: false } : next;
        if (replace) router.replace(path);
        else router.push(path);
      }
    } catch {
      toast(LOGIN_FAILURE_MESSAGE);
    } finally {
      if (!keepLocked) {
        inFlight.current = false;
        setPendingProvider(null);
      }
    }
  };

  return { pendingProvider, login };
}

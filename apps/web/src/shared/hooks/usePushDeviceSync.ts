'use client';

import { useEffect } from 'react';
import { isNativeShell } from '../bridge/client';
import { resetPushDeviceSync, syncPushDevice } from '../lib/pushDevice';

// 쉘이 bridge 메서드 목록을 알려 주기 전에는 등록할 수 없어 짧게 몇 번 다시 시도
const RETRY_MS = 300;
const RETRY_LIMIT = 10;

/**
 * 가입을 마친 로그인 상태의 쉘에서 이 기기의 푸시 토큰을 서버에 등록. `memberId`가 없으면(비로그인·가입 중) 등록하지 않음
 * 회원이 바뀌거나 로그인 상태가 끝나면 마지막 등록 기록을 지워, 로그아웃 없이 세션이 끝난 뒤 다른 계정으로 로그인해도 새 계정에 다시 등록함
 * 켜질 때와 앱으로 돌아올 때(탭이 다시 보이거나 창이 포커스를 받을 때) 다시 확인해, 설정에서 알림 권한을 바꾸거나 토큰이 갱신된 경우를 반영함
 * 값이 같으면 보내지 않고 실패는 조용히 넘어감(`syncPushDevice`)
 */
export function usePushDeviceSync(memberId: string | null) {
  useEffect(() => {
    if (memberId === null || !isNativeShell()) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const run = (attempt = 0) => {
      void syncPushDevice()
        .then((result) => {
          if (cancelled || result !== 'unavailable' || attempt >= RETRY_LIMIT) return;
          retryTimer = setTimeout(() => run(attempt + 1), RETRY_MS);
        })
        .catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      // 이 회원의 등록 기록은 이 회원이 끝나면 함께 지움(다음 회원·다음 로그인은 처음부터 등록)
      resetPushDeviceSync();
      clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [memberId]);
}

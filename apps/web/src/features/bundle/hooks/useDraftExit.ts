'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { BUNDLE_PATHS } from '../constants/paths';

/** 번들에서 나가면 번치 홈으로 이동. 초안 생성자가 나가면 작성 중인 번들이 삭제되어 토스트로 알림(기능 spec 4.3.2 상세 동작 6) */
export function useLeaveDraft() {
  const router = useRouter();
  return useCallback(
    (creator: boolean) => {
      if (creator) toast(BUNDLE_MESSAGES.draftDeleted, { fullWidth: true });
      router.replace(BUNDLE_PATHS.bunchHome);
    },
    [router],
  );
}

/** 없는 초안(삭제됨·발행됨·잘못된 id)은 「삭제된 번들이에요」 토스트 뒤 번치 홈으로 이동 */
export function useRedirectMissingDraft(missing: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!missing) return;
    toast(BUNDLE_MESSAGES.deletedDraft, { fullWidth: true });
    router.replace(BUNDLE_PATHS.bunchHome);
  }, [missing, router]);
}

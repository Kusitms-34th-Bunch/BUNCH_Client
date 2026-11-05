'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { Draft } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { BUNDLE_PATHS } from '../constants/paths';
import { useLeaveBundleMutation } from '../queries/bundles';

/**
 * 번들에서 나가면 서버에 반영한 뒤 번치 홈으로 이동. 초안 생성자가 나가면 작성 중인 번들이 삭제되어 토스트로 알림(기능 spec 4.3.2 상세 동작 6)
 * 서버가 거절하거나 실패하면 이동하지 않고 안내(나갔다고 보이는데 초안이 남는 일 방지)
 */
export function useLeaveDraft(draftId: string | undefined) {
  const router = useRouter();
  const { data: profile } = useQuery(myProfileQueryOptions());
  const { mutateAsync } = useLeaveBundleMutation(profile?.bunch?.id);
  // 확인 창은 서버 응답 동안 열려 있어 「나가기」를 연달아 눌러도 한 번만 보냄
  const leaving = useRef(false);
  return useCallback(
    async (creator: boolean) => {
      if (draftId === undefined || leaving.current) return;
      leaving.current = true;
      try {
        await mutateAsync(draftId);
      } catch {
        leaving.current = false;
        toast(BUNDLE_MESSAGES.leaveFailed, { fullWidth: true });
        return;
      }
      if (creator) toast(BUNDLE_MESSAGES.draftDeleted, { fullWidth: true });
      router.replace(BUNDLE_PATHS.bunchHome);
    },
    [draftId, mutateAsync, router],
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

/**
 * 주소의 사진이 처음부터 초안에 없으면 「사진함에서 삭제된 사진이에요.」 토스트 뒤 작성 화면으로 이동하고 false를 돌려줌
 * 초안이 처음 준비된 때 한 번만 판단해(그 전에는 undefined), 화면을 보는 동안 그 사진을 빼도 쫓겨나지 않음
 */
export function useRedirectMissingPhoto(draft: Draft | undefined, photoId: string | undefined) {
  const router = useRouter();
  const [present, setPresent] = useState<boolean | undefined>(undefined);
  // 초안이 준비되는 첫 렌더에 한 번만 정함(렌더 중 상태 보정)
  if (present === undefined && draft !== undefined) {
    setPresent(draft.photos.some((photo) => photo.id === photoId));
  }
  const draftId = draft?.id;
  useEffect(() => {
    if (present !== false || draftId === undefined) return;
    toast(BUNDLE_MESSAGES.photoDeleted, { fullWidth: true });
    router.replace(BUNDLE_PATHS.draft(draftId));
  }, [present, draftId, router]);
  return present === true;
}

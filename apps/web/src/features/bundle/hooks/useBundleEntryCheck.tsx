'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import { NeedMembersDialog } from '../components/bundles/NeedMembersDialog';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { useFetchBundleEntryState } from '../queries/bundles';

// 번들은 번치 멤버가 2명 이상일 때 만들 수 있고, 번치당 작성 중인 번들은 최대 10개(기능명세 4.1.1·4.1.4)
const MIN_MEMBERS = 2;
const MAX_DRAFTS = 10;

/** 「함께할 멤버가 없어요」 창을 여는 함수. 「초대하기」는 멤버 초대 화면으로 */
export function useNeedMembersDialog() {
  const router = useRouter();
  const openOverlay = useScreenOverlay();
  return () =>
    openOverlay((rootProps, close) => (
      <NeedMembersDialog
        {...rootProps}
        onInvite={() => {
          close();
          router.push(BUNDLE_SELECT_PATHS.memberInvite);
        }}
      />
    ));
}

/**
 * 번들 만들기에 들어가기 전 확인(기능명세 4.1.1 상세 동작 1, 사진함 3.3.4 상세 동작 1)
 * 멤버가 나 혼자면 「함께할 멤버가 없어요」 창, 작성 중인 번들이 이미 10개면 토스트를 띄우고 false
 * 확인 요청이 실패하면 막지 않음(초안을 만들 때 서버가 다시 판단하고 4.1.4의 안내를 띄움)
 */
export function useBundleEntryCheck() {
  const fetchEntryState = useFetchBundleEntryState();
  const openNeedMembers = useNeedMembersDialog();
  // 확인을 기다리는 동안 다시 눌러도 한 번만
  const checking = useRef(false);

  return async (bunchId: string | undefined): Promise<boolean> => {
    if (bunchId === undefined) return true;
    if (checking.current) return false;
    checking.current = true;
    try {
      // 그사이 멤버가 나갔거나 다른 멤버가 초안을 만들었을 수 있어 새로 받음
      const [members, drafts] = await fetchEntryState(bunchId);
      if (members.status === 'fulfilled' && members.value.length < MIN_MEMBERS) {
        openNeedMembers();
        return false;
      }
      if (drafts.status === 'fulfilled' && drafts.value >= MAX_DRAFTS) {
        toast(BUNDLE_SELECT_MESSAGES.draftLimitEntry);
        return false;
      }
      return true;
    } finally {
      checking.current = false;
    }
  };
}

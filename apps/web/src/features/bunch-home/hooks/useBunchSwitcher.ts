'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { myBunchesQueryOptions } from '@/shared/query/myBunches';
import type { BunchSummary } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { toBunchSummaries } from '../model/bunchHome';
import { useDeleteBunchNoticeMutation, useSwitchBunchMutation } from '../queries/bunchHome';
import { useBunchSwitchSheet } from './useBunchSwitchSheet';

type CurrentBunch = { id: string; name: string; imageSrc?: string | undefined };

/**
 * 번치 탭 밖(사진함 헤더)에서 번치 전환 시트를 여는 hook. 전환 목록은 `members/me/bunches`를 받아 쓰고,
 * 전환하면 기본 번치(`members/me`)가 새 번치로 바뀌어 사진함 등 앱 전체가 새 번치 기준이 됨
 * 번치를 아직 모르면(current가 undefined) 열 수 없어 `open`도 undefined
 */
export function useBunchSwitcher(current: CurrentBunch | undefined) {
  const router = useRouter();
  const myBunches = useQuery({ ...myBunchesQueryOptions(), enabled: current !== undefined });
  const switchBunch = useSwitchBunchMutation();
  const deleteNotice = useDeleteBunchNoticeMutation();

  const currentId = current?.id;
  const currentName = current?.name;
  const currentImage = current?.imageSrc;
  // 전환 목록은 화면을 막지 않음: 못 받으면 지금 번치 하나로 보임
  const bunches = useMemo<readonly BunchSummary[]>(() => {
    if (currentId === undefined || currentName === undefined) return [];
    if (myBunches.data) return toBunchSummaries(myBunches.data, currentId);
    return [
      { id: currentId, name: currentName, imageSrc: currentImage, alertCount: 0, access: 'active' },
    ];
  }, [currentId, currentName, currentImage, myBunches.data]);
  const atBunchLimit = myBunches.data
    ? myBunches.data.activeCount >= myBunches.data.maxActiveCount
    : false;

  const { openSwitcher, switcherOpen } = useBunchSwitchSheet({
    currentId: currentId ?? '',
    bunches,
    switchBunch: async (bunchId) => {
      await switchBunch.mutateAsync(bunchId);
    },
    removeBunch: (bunchId) => {
      const noticeId = bunches.find((bunch) => bunch.id === bunchId)?.noticeId;
      if (!noticeId || deleteNotice.isPending) return;
      deleteNotice.mutate(noticeId, {
        onError: () => toast(BUNCH_HOME_MESSAGES.removeBunchFailed),
      });
    },
    onAddBunch: () =>
      atBunchLimit
        ? toast(BUNCH_HOME_MESSAGES.bunchLimit)
        : router.push(BUNCH_HOME_PATHS.startBunch),
  });

  return { open: current === undefined ? undefined : openSwitcher, switcherOpen };
}

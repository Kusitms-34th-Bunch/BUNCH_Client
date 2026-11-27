'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type RefObject, useRef } from 'react';
import { myBunchesQueryOptions } from '@/shared/query/myBunches';
import type { BunchSummary } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { toBunchSummaries } from '../model/bunchHome';
import { useDeleteBunchNoticeMutation, useSwitchBunchMutation } from '../queries/bunchHome';
import { useBunchSwitchMotion } from './useBunchSwitchMotion';
import { useBunchSwitchSheet } from './useBunchSwitchSheet';

type CurrentBunch = { id: string; name: string; imageSrc?: string | undefined };

/**
 * 번치 탭 밖(사진함 헤더)에서 번치 전환 시트를 여는 hook. 전환 목록은 `members/me/bunches`를 받아 쓰고,
 * 전환하면 기본 번치(`members/me`)가 새 번치로 바뀌어 사진함 등 앱 전체가 새 번치 기준이 됨
 * 번치를 아직 모르면(current가 undefined) 열 수 없어 `open`도 undefined
 */
export function useBunchSwitcher(
  current: CurrentBunch | undefined,
  /** 웹 전환 모션이 붙잡을 화면을 찾는 기준(화면 틀 안 또는 바깥 요소). iOS 쉘은 쉘이 화면 전체를 움직여 없어도 됨 */
  motionAnchor?: RefObject<HTMLElement | null>,
) {
  const router = useRouter();
  const myBunches = useQuery({ ...myBunchesQueryOptions(), enabled: current !== undefined });
  const switchBunch = useSwitchBunchMutation();
  const deleteNotice = useDeleteBunchNoticeMutation();

  const currentId = current?.id;
  // 번치 탭과 같은 전환 모션(인스타 계정 전환처럼, motion.md)
  const noAnchor = useRef<HTMLElement | null>(null);
  const switchMotion = useBunchSwitchMotion(motionAnchor ?? noAnchor, currentId ?? '');
  const currentName = current?.name;
  const currentImage = current?.imageSrc;
  // 전환 목록은 화면을 막지 않음: 못 받았거나 낡았어도 지금 번치는 보임
  const bunches: readonly BunchSummary[] = (() => {
    if (currentId === undefined || currentName === undefined) return [];
    return toBunchSummaries(myBunches.data, {
      id: currentId,
      name: currentName,
      imageSrc: currentImage,
      alertCount: 0,
      access: 'active',
    });
  })();
  const atBunchLimit = myBunches.data
    ? myBunches.data.activeCount >= myBunches.data.maxActiveCount
    : false;

  const { openSwitcher, switcherOpen } = useBunchSwitchSheet({
    currentId: currentId ?? '',
    bunches,
    // 화면을 붙잡은 뒤 전환(전환은 새 번치 홈을 받는 즉시 지금 번치를 바꿔 붙잡기 전에 바뀌면 모션이 빠짐)
    switchBunch: async (bunchId) => {
      await switchMotion.begin();
      await switchBunch.mutateAsync(bunchId).catch((error: unknown) => {
        switchMotion.cancel();
        throw error;
      });
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

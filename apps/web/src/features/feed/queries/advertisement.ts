import { toast } from '@app/design-system';
import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { isWireId, toDomainId } from '@/shared/api/ids';
import type { FeedPage } from '../model/feed';
import { hideAd, pinAd } from '../api/advertisement';
import { unpinPlace } from '../api/kok';
import { FEED_MESSAGES } from '../constants/messages';
import { markAdHidden } from '../lib/hiddenAds';
import { feedKeys } from './keys';
import { isAlreadyUnpinned, KOK_KEY, KOK_SCOPE, refreshKoksWhenIdle } from './kok';

export type AdKokVariables = { adId: string; viewerId: string | null } & (
  | { pin: true }
  | { pin: false; pinId: number }
);

type AdKok = { pinned: boolean; pinId: number | null };

// 같은 광고가 여러 자리에 와서 그 광고의 모든 자리를 함께 바꿈
const patchAd = (data: InfiniteData<FeedPage> | undefined, adId: string, next: Partial<AdKok>) =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        'advertisement' in item && toDomainId(item.advertisement.id) === adId
          ? { ...item, advertisement: { ...item.advertisement, ...next } }
          : item,
      ),
    })),
  };

const readAd = (data: InfiniteData<FeedPage> | undefined, adId: string): AdKok | undefined =>
  data?.pages
    .flatMap((page) => page.items)
    .flatMap((item) =>
      'advertisement' in item && toDomainId(item.advertisement.id) === adId
        ? [{ pinned: item.advertisement.pinned, pinId: item.advertisement.pinId ?? null }]
        : [],
    )[0];

/**
 * 광고 장소 콕하기·콕 취소(명세 022·009). 누르면 피드 캐시의 그 광고를 바로 바꾸고, 실패하면 되돌리고 알림
 * 다른 멤버가 이미 뺀 콕의 취소는 뺀 상태로 맞추고 알리지 않음(그래서 공통 토스트 대신 여기서 띄움, 화면을 떠난 뒤 실패해도 알림)
 * 번들 장소 콕과 같은 차례로 하나씩 보내고, 마지막 요청이 끝나면 번들 시트의 콕 여부를 다시 받음(같은 장소가 번들에도 있음)
 * ponytail: 번들 시트에서 같은 장소를 콕해도 광고 카드는 피드를 다시 받을 때 맞춰짐(낡은 콕 ID 취소는 404라 알리지 않고 맞춤)
 */
export const useAdKokMutation = () => {
  const queryClient = useQueryClient();
  const write = (vars: AdKokVariables, adId: string, next: Partial<AdKok>) =>
    queryClient.setQueryData<InfiniteData<FeedPage>>(feedKeys.list(vars.viewerId), (data) =>
      patchAd(data, adId, next),
    );
  return useMutation({
    mutationKey: KOK_KEY,
    scope: KOK_SCOPE,
    // 성공하면 그 광고의 콕 ID(취소면 null)
    mutationFn: async (vars: AdKokVariables): Promise<number | null> => {
      if (!isWireId(vars.adId)) throw new Error('invalid advertisement');
      if (vars.pin) return (await pinAd(vars.adId)).id;
      await unpinPlace(vars.pinId);
      return null;
    },
    onMutate: (vars) => {
      const { adId } = vars;
      // 피드 받기는 취소하지 않음(다음 쪽 받기를 끊지 않게, 다시 받으면 서버 값으로 맞춰짐)
      const previous = readAd(
        queryClient.getQueryData<InfiniteData<FeedPage>>(feedKeys.list(vars.viewerId)),
        adId,
      );
      // 취소는 콕 ID도 비움(옛 ID로 다시 취소하지 못하게)
      write(vars, adId, vars.pin ? { pinned: true } : { pinned: false, pinId: null });
      return { previous, adId };
    },
    onError: (error, vars, context) => {
      const gone = isAlreadyUnpinned(error, vars);
      if (!gone) toast(FEED_MESSAGES.actionFailed);
      if (!context) return;
      const next = gone ? { pinned: false, pinId: null } : context.previous;
      if (next) write(vars, context.adId, next);
    },
    onSuccess: (pinId, vars, context) => {
      // 그사이 다시 받은 값이 덮었어도 이 요청의 결과로 확정(취소면 콕 ID도 비움)
      write(
        vars,
        context.adId,
        pinId === null ? { pinned: false, pinId: null } : { pinned: true, pinId },
      );
    },
    onSettled: (_data, _error, vars) => refreshKoksWhenIdle(queryClient, vars.viewerId),
  });
};

/** 광고 숨기기(명세 023). 성공하면 앱이 켜져 있는 동안 기억(화면을 떠난 뒤 성공해도), 실패하면 공통 토스트 */
export const useHideAdMutation = () =>
  useMutation({
    mutationFn: hideAd,
    onSuccess: (_data, adId) => markAdHidden(adId),
    meta: { errorMessage: FEED_MESSAGES.actionFailed },
  });

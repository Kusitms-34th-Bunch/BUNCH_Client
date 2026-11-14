import { toast, type ToastOptions } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { FeedViewer } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';

/**
 * 지금 번치(내 정보의 기본 번치). 받기 전·실패는 undefined, 소속 번치 없음은 null.
 * `asBunch`: 번치 명의 행동의 공통 확인. 받는 중은 무시, 실패는 오류, 번치 없음은 안내 토스트(기능명세서 6.1.7)
 */
export function useFeedViewer(toastOptions?: ToastOptions) {
  // 옵션이 없으면 toast()에 두 번째 인자를 넘기지 않음
  const notify = (message: string) =>
    toastOptions ? toast(message, toastOptions) : toast(message);
  const {
    data: profile,
    isPending: viewerPending,
    isError: viewerFailed,
    refetch: retryViewer,
  } = useQuery(myProfileQueryOptions());
  const viewer: FeedViewer | undefined =
    profile === undefined
      ? undefined
      : profile.bunch
        ? {
            bunchId: profile.bunch.id,
            name: profile.bunch.name,
            imageSrc: profile.bunch.imageSrc,
            characterType: profile.bunch.characterType,
            memberName: profile.nickname ?? undefined,
            memberImageSrc: profile.imageSrc ?? undefined,
          }
        : null;

  const asBunch = (action: () => void) => {
    if (viewer) return action();
    if (viewer === null) notify(text.joinRequired);
    else if (!viewerPending) notify(text.actionFailed);
  };

  return { viewer, viewerPending, viewerFailed, retryViewer, asBunch };
}

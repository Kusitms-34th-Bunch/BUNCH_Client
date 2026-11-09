import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { FeedViewer } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_TOAST_OFFSET } from '../constants/toast';

/**
 * 지금 번치(내 정보의 기본 번치, 번치 홈과 같은 기준). 받기 전·실패는 undefined, 소속 번치가 없으면 null
 * `toastOffset`: 하단 탭이 없는 화면은 null
 * `asBunch`: 번치 명의 행동의 공통 확인. 받는 중은 조용히 무시, 실패는 오류, 번치 없음은 안내 토스트(기능명세서 6.1.7)
 */
export function useFeedViewer(toastOffset: number | null = FEED_TOAST_OFFSET) {
  const { data: profile, isPending: viewerPending } = useQuery(myProfileQueryOptions());
  const viewer: FeedViewer | undefined =
    profile === undefined
      ? undefined
      : profile.bunch
        ? { bunchId: profile.bunch.id, name: profile.bunch.name, imageSrc: profile.bunch.imageSrc }
        : null;
  const options = toastOffset === null ? {} : { bottomOffset: toastOffset };

  const asBunch = (action: () => void) => {
    if (viewer) action();
    else if (viewer === null) toast(text.joinRequired, options);
    else if (!viewerPending) toast(text.actionFailed, options);
  };

  return { viewer, viewerPending, asBunch };
}

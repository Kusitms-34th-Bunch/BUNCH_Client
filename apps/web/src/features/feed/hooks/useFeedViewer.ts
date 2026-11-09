import { toast, type ToastOptions } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import type { FeedViewer } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_TOAST_OFFSET } from '../constants/toast';

/**
 * 지금 번치(내 정보의 기본 번치). 받기 전·실패는 undefined, 소속 번치 없음은 null. 토스트 위치 기본값은 하단 탭 위
 * `asBunch`: 번치 명의 행동의 공통 확인. 받는 중은 무시, 실패는 오류, 번치 없음은 안내 토스트(기능명세서 6.1.7)
 */
export function useFeedViewer(
  // 토스트를 띄우는 순간 위치를 정해야 하면(입력란 높이가 바뀌는 화면) 함수로 넘김
  toastOptions: ToastOptions | (() => ToastOptions) = { bottomOffset: FEED_TOAST_OFFSET },
) {
  const { data: profile, isPending: viewerPending } = useQuery(myProfileQueryOptions());
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
    const options = typeof toastOptions === 'function' ? toastOptions() : toastOptions;
    if (viewer === null) toast(text.joinRequired, options);
    else if (!viewerPending) toast(text.actionFailed, options);
  };

  return { viewer, viewerPending, asBunch };
}

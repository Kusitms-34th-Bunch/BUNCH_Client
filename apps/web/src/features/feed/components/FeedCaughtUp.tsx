'use client';

import { LazyLottie } from '@/shared/components/loading/LazyLottie';
import { createLottieLoader } from '@/shared/lib/lottieLoader';
import { FEED_MESSAGES as text } from '../constants/messages';
import { useInView } from '../hooks/useInView';

const loadConfetti = createLottieLoader(
  () => import('@/shared/assets/lotties/feedCaughtUpConfetti.json'),
);
const loadCheck = createLottieLoader(
  () => import('@/shared/assets/lotties/feedCaughtUpCheck.json'),
);

/**
 * 구간 안내(Figma `4940:101293`, 축하 로티와 양옆 선) · 끝 안내(`4940:101966`, 체크 로티)
 * 로티는 안내가 처음 화면에 보일 때 한 번 재생(기능명세서 6.1.4, 피드에 다시 들어오면 다시 재생). 글자는 목록의 끝을 알리는 일반 문단
 */
export function FeedCaughtUp({ kind }: { kind: 'following' | 'all' }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  if (kind === 'following') {
    return (
      <div ref={ref} className="py-s14 px-padding-p8 flex flex-col items-center">
        {inView ? (
          <LazyLottie load={loadConfetti} loop={false} className="block size-9" />
        ) : (
          <span aria-hidden="true" className="block size-9" />
        )}
        <div className="flex w-full items-center gap-2.25">
          <span aria-hidden="true" className="bg-border-tertiary h-px flex-1" />
          <p className="typography-body-3-regular text-text-quinary">{text.followingDone}</p>
          <span aria-hidden="true" className="bg-border-tertiary h-px flex-1" />
        </div>
      </div>
    );
  }
  return (
    <div ref={ref} className="py-padding-p18 flex flex-col items-center">
      {inView ? (
        <LazyLottie load={loadCheck} loop={false} stillFrame="last" className="block size-9" />
      ) : (
        <span aria-hidden="true" className="block size-9" />
      )}
      <p className="typography-body-3-regular text-text-quinary">{text.allDone}</p>
    </div>
  );
}

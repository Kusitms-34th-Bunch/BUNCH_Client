'use client';

import { cn } from '@app/design-system';
import { LazyLottie } from '@/shared/components/loading/LazyLottie';
import { createLottieLoader } from '@/shared/lib/lottieLoader';
import { FEED_MESSAGES as text } from '../constants/messages';
import { useInView } from '../hooks/useInView';
import motion from './caughtUpMotion.module.css';

const loadConfetti = createLottieLoader(
  () => import('@/shared/assets/lotties/feedCaughtUpConfetti.json'),
);
const loadCheck = createLottieLoader(
  () => import('@/shared/assets/lotties/feedCaughtUpCheck.json'),
);

/**
 * 구간 안내(Figma `4940:101293`, 축하 로티와 양옆 선) · 끝 안내(`4940:101966`, 체크 로티)
 * 로티는 안내가 처음 화면에 보일 때 한 번 재생하고 글자도 그때 투명도로 나타남(기능명세서 6.1.4, 피드에 다시 들어오면 다시 재생). 글자는 목록의 끝을 알리는 일반 문단
 */
export function FeedCaughtUp({ kind }: { kind: 'following' | 'all' }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  // 글자는 처음부터 DOM에 두고(화면 낭독) 보이기 전에는 투명, 보이면 아이콘과 함께 나타남. 동작 줄이기면 그대로 보임
  const textMotion = inView ? motion.fadeIn : 'opacity-0 motion-reduce:opacity-100';
  if (kind === 'following') {
    return (
      <div ref={ref} className="py-s14 px-padding-p8 flex flex-col items-center">
        {inView ? (
          <LazyLottie load={loadConfetti} loop={false} className="block size-9" />
        ) : (
          <span aria-hidden="true" className="block size-9" />
        )}
        <div className={cn('flex w-full items-center gap-2.25', textMotion)}>
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
      <p className={cn('typography-body-3-regular text-text-quinary', textMotion)}>
        {text.allDone}
      </p>
    </div>
  );
}

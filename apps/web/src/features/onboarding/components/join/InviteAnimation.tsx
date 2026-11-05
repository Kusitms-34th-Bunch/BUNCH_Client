import { useEffect, useState } from 'react';
import type { LottieLight } from '../../lib/lottieLight';

type LottiePlayer = typeof LottieLight;

type InviteAnimationProps = {
  /** 현재 프레임(0부터, 30fps) 전달 */
  onFrame: (_frame: number) => void;
  onComplete: () => void;
  /** 로딩·재생 실패 시 다음 화면으로 이동하기 위한 콜백 */
  onError: () => void;
};

/** 표현식이 없는 로티에 light 엔진 적용; 엔진·JSON은 화면 진입 시 동적 로딩 */
export function InviteAnimation({ onFrame, onComplete, onError }: InviteAnimationProps) {
  const [loaded, setLoaded] = useState<{ Player: LottiePlayer; data: object } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      import('../../lib/lottieLight'),
      import('@/shared/assets/lotties/inviteAnimation.json'),
    ])
      .then(([library, animation]) => {
        if (alive) setLoaded({ Player: library.LottieLight, data: animation.default });
      })
      .catch(() => {
        if (alive) onError();
      });
    return () => {
      alive = false;
    };
  }, [onError]);

  if (!loaded) return null;
  const { Player, data } = loaded;

  return (
    <Player
      src={data}
      autoplay
      loop={false}
      subscriptions={{
        frame: ({ currentFrame }) => onFrame(currentFrame),
        complete: onComplete,
        error: onError,
      }}
      className="size-full"
      // 장식 연출은 보조기술에서 숨김; 로딩 상태는 화면 제목으로 전달
      aria-hidden="true"
    />
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { LottieLight } from './lottieLight';

type LottiePlayer = typeof LottieLight;

type InviteAnimationProps = {
  /** 한 번 끝까지 재생되면 호출한다 */
  onComplete: () => void;
  /** 재생 라이브러리·자산을 불러오지 못했을 때 호출한다. 화면이 멈추지 않게 다음으로 넘기는 용도 */
  onError: () => void;
};

/**
 * 초대장 로티(`inviteAnimation.json`, 375×734 장면)를 한 번 재생한다
 * 이 로티에는 표현식이 없어 가장 작은 light 빌드(`LottieLight`)를 쓴다
 * 라이브러리와 자산은 번들이 커서 이 화면이 열릴 때 동적으로 불러온다(`docs/architecture/motion.md`)
 */
export function InviteAnimation({ onComplete, onError }: InviteAnimationProps) {
  const [loaded, setLoaded] = useState<{ Player: LottiePlayer; data: object } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([import('./lottieLight'), import('./inviteAnimation.json')])
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
      subscriptions={{ complete: onComplete, error: onError }}
      className="size-full"
      // 장식 연출이라 보조기술에서는 숨기고, 상태는 화면의 안내 문구가 전달한다
      aria-hidden="true"
    />
  );
}

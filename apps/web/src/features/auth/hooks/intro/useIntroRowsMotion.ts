import { type RefObject, useEffect } from 'react';
import { CENTER, COPIES, TILE_PITCH } from '@/features/auth/constants/introRows';

// 좌표·시각은 디자이너 Lottie(인트로_01~04, 375×812·60fps) 기준
const FPS = 60;
// 줄은 210f부터 48f 동안 15.6px 가속한 뒤 초당 약 40px로 흐름. Lottie는 624f에서 멈추지만 화면은 누를 때까지 계속 흐름
const DRIFT_FROM = 210;
const EASE_FRAMES = 48;
const EASE_PX = 15.6;
const SPEED = (244.4 / 366) * FPS;
// 360f(장면 2→3을 누른 시각)까지 흐른 거리. 사라짐·나타남 순서의 기준점이 이만큼 옮겨 감
const DRIFT_AT_TAP = 83.7;

const ms = (frames: number) => (frames / FPS) * 1000;

/**
 * IntroRows의 흐름·나타남·사라짐. 줄 DOM의 data-* 속성(ease·track·item·photo-row)을 읽어 Web Animations로 재생
 * 나타남·사라짐은 Lottie 키프레임을 옮긴 것. 중앙(장면 3은 흐른 만큼 옮긴 기준점)에서 먼 칸일수록 늦음
 */
export function useIntroRowsMotion(
  rootRef: RefObject<HTMLDivElement | null>,
  scene: number,
  still: boolean,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof root.animate !== 'function') return;
    // 인트로 도중 동작 줄이기를 켜면 이미 흐르던 줄도 멈춤
    if (still) {
      root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      return;
    }
    const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
    // 화면 폭이 375가 아니어도 디자인 좌표로 거리를 잼
    const rootBox = root.getBoundingClientRect();
    const scale = rootBox.width / 375 || 1;
    const liveX = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return (box.left + box.width / 2 - rootBox.left) / scale;
    };

    if (scene === 1) {
      // 누른 시각(141f)부터 210f에 흐르기 시작
      const start = ms(DRIFT_FROM - 141);
      for (const ease of all('[data-ease]')) {
        const dir = Number(ease.dataset.dir);
        const period = Number(ease.dataset.period);
        ease.animate(
          [
            { transform: 'none' },
            { transform: `translateX(${(dir * EASE_PX * 100) / (period * COPIES)}%)` },
          ],
          {
            duration: ms(EASE_FRAMES),
            delay: start,
            easing: 'cubic-bezier(0.42, 0, 1, 1)',
            fill: 'forwards',
          },
        );
        ease
          .querySelector<HTMLElement>('[data-track]')
          ?.animate(
            [{ transform: 'none' }, { transform: `translateX(${(dir * 100) / COPIES}%)` }],
            {
              duration: (period / SPEED) * 1000,
              delay: start + ms(EASE_FRAMES),
              iterations: Infinity,
            },
          );
      }
      for (const tile of all('[data-item=tile]')) {
        const steps = Math.abs(Number(tile.dataset.x) - CENTER) / TILE_PITCH;
        // 가운데 다이아몬드는 Lottie의 큰 다이아몬드가 줄어들어 놓이는 자리라 204f에 바로 보임
        if (steps < 0.01) {
          tile.animate([{ opacity: 1 }, { opacity: 1 }], {
            duration: 1,
            delay: ms(204 - 141),
            fill: 'forwards',
          });
          continue;
        }
        const delay = ms(Number(tile.dataset.enter) + 8.7 * steps - 141);
        tile.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: ms(7.2),
          delay,
          easing: 'cubic-bezier(0, 0, 0.58, 1)',
          fill: 'both',
        });
        tile.animate(
          [
            { transform: 'scale(0.4)' },
            { transform: 'scale(1.012)', offset: 0.55 },
            { transform: 'none' },
          ],
          { duration: ms(19), delay, easing: 'ease-out', fill: 'both' },
        );
      }
    }

    if (scene === 2) {
      for (const tile of all('[data-item=tile]')) {
        const origin = CENTER + Number(tile.dataset.dir) * DRIFT_AT_TAP;
        const delay = ms((6.78 * Math.abs(liveX(tile) - origin)) / TILE_PITCH);
        const timing = {
          duration: ms(18),
          delay,
          easing: 'cubic-bezier(0.42, 0, 0.58, 1)',
          fill: 'both',
        } as const;
        tile.getAnimations().forEach((animation) => animation.cancel());
        tile.animate([{ opacity: 1 }, { opacity: 0 }], timing);
        tile.animate([{ transform: 'none' }, { transform: 'scale(0.6)' }], timing);
      }
      for (const card of all('[data-item=photo]')) {
        const origin = CENTER + Number(card.dataset.dir) * DRIFT_AT_TAP;
        const delay = ms(Number(card.dataset.enter) + 0.0683 * Math.abs(liveX(card) - origin));
        const easing = 'cubic-bezier(0, 0, 0.58, 1)';
        card.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: ms(21),
          delay,
          easing,
          fill: 'both',
        });
        card.animate([{ transform: 'scale(0.879)' }, { transform: 'none' }], {
          duration: ms(18),
          delay,
          easing,
          fill: 'both',
        });
      }
    }

    if (scene === 3) {
      const fades = all('[data-photo-row]').map(
        (row) =>
          row.animate(
            [
              { opacity: 1, transform: 'none' },
              { opacity: 0, transform: 'scale(0.96)' },
            ],
            { duration: ms(24), easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
          ).finished,
      );
      // 다 사라진 뒤에는 보이지 않는 줄을 계속 돌리지 않음
      Promise.all(fades)
        .then(() =>
          all('[data-ease], [data-track]').forEach((element) =>
            element.getAnimations().forEach((animation) => animation.cancel()),
          ),
        )
        .catch(() => {});
    }
  }, [rootRef, scene, still]);
}

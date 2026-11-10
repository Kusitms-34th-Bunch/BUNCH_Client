import { type RefObject, useEffect } from 'react';

// 장면 2 타일 색(파랑·분홍·초록·주황)을 미리 비춤
const TINTS = [
  '--primitive-bunch-500',
  '--primitive-pink-400',
  '--primitive-green-400',
  '--primitive-orange-400',
];
const FLOAT_MS = 2400;
const FLOAT_PX = 4;
// 대각선 한 칸(행 + 열)마다 늦게 떠올라 물결처럼 보임. 맨 앞 줄(2)은 다 쌓이자마자 시작
const WAVE_MS = 80;
const FIRST_WAVE = 2;
const TINT_EVERY_MS = 1500;
const TINT_MS = 1200;
// 아래쪽은 Lottie의 흰 그라데이션에 덮여 있어 물들어도 잘 안 보이므로 이 높이(디자인 px)보다 위 타일만
const TINT_ABOVE = 380;
const SETTLE_MS = 200;

/**
 * 인트로 첫 장면의 다이아몬드 타일이 다 쌓여 멈춘 뒤에도 살아 있게 함: 대각선 순서로 천천히 떠오르고, 타일 하나씩 장면 2 색으로 잠깐 물듦
 * 타일은 Lottie 그룹에 붙인 class(`intro-module intro-wave-N`)로 찾음. 끝나면 제자리·원래 색으로 돌아온 뒤 Lottie가 이어서 재생
 */
export function useTileStackIdle(rootRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;
    const tiles = Array.from(root.querySelectorAll<SVGGElement>('.intro-module'));
    if (tiles.length === 0 || typeof tiles[0]!.animate !== 'function') return;

    const floats = tiles.map((tile) => {
      const wave = Number(/intro-wave-(\d)/.exec(tile.getAttribute('class') ?? '')?.[1] ?? 0);
      return tile.animate(
        [{ translate: '0 0' }, { translate: `0 -${FLOAT_PX}px` }, { translate: '0 0' }],
        {
          duration: FLOAT_MS,
          delay: Math.max(wave - FIRST_WAVE, 0) * WAVE_MS,
          iterations: Infinity,
          easing: 'ease-in-out',
        },
      );
    });

    const box = root.getBoundingClientRect();
    const tintLine = box.top + (TINT_ABOVE * box.width) / 375;
    const tintable = tiles.flatMap((tile) => {
      const rect = tile.getBoundingClientRect();
      const visible = rect.right > box.left && rect.left < box.right && rect.bottom > box.top;
      const path = tile.querySelector('path');
      return visible && path && rect.top + rect.height / 2 < tintLine ? [path] : [];
    });
    const colors = getComputedStyle(root);
    const tints: Animation[] = [];
    let turn = 0;
    let last = -1;
    const tint = () => {
      if (tintable.length === 0) return;
      let pick = Math.floor(Math.random() * tintable.length);
      if (pick === last) pick = (pick + 1) % tintable.length;
      last = pick;
      const path = tintable[pick]!;
      const base = getComputedStyle(path).fill;
      const color = colors.getPropertyValue(TINTS[turn++ % TINTS.length]!).trim();
      // 끝난 것은 버려 오래 머물러도 쌓이지 않게
      tints.splice(
        0,
        tints.length,
        ...tints.filter((animation) => animation.playState !== 'finished'),
      );
      tints.push(
        path.animate(
          [
            { fill: base },
            { fill: color, offset: 0.3 },
            { fill: color, offset: 0.6 },
            { fill: base },
          ],
          { duration: TINT_MS, easing: 'ease-in-out' },
        ),
      );
    };
    // 첫 색은 다 쌓이자마자
    tint();
    const timer = setInterval(tint, TINT_EVERY_MS);

    return () => {
      clearInterval(timer);
      // 그 자리에서 끊으면 튀어 보이므로 지금 모양에서 원래대로 짧게 돌아옴
      floats.forEach((animation, index) => {
        const tile = tiles[index]!;
        const from = getComputedStyle(tile).translate;
        animation.cancel();
        tile.animate([{ translate: from }, { translate: '0 0' }], {
          duration: SETTLE_MS,
          easing: 'ease-out',
        });
      });
      tints.forEach((animation) => {
        const path = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
        if (!(path instanceof SVGElement)) return animation.cancel();
        const from = getComputedStyle(path).fill;
        animation.cancel();
        const base = getComputedStyle(path).fill;
        if (from !== base) {
          path.animate([{ fill: from }, { fill: base }], {
            duration: SETTLE_MS,
            easing: 'ease-out',
          });
        }
      });
    };
  }, [rootRef, active]);
}

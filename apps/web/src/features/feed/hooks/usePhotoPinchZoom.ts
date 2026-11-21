import { useEffect, useState } from 'react';

const MAX_SCALE = 4;
const RETURN_MS = 200;
const MAX_DIM = 0.8;

type Point = { x: number; y: number };
const midpoint = (a: Touch, b: Touch): Point => ({
  x: (a.clientX + b.clientX) / 2,
  y: (a.clientY + b.clientY) / 2,
});
const distance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

// 터치한 곳이 속한 슬라이드의 사진(슬라이드 위 버튼·그라데이션을 눌러도 그 사진)
const photoOf = (target: EventTarget | null, root: HTMLElement): HTMLImageElement | null => {
  for (let node = target instanceof Element ? target : null; node && node !== root;) {
    const img = node.querySelector<HTMLImageElement>(':scope > img');
    if (img) return img;
    node = node.parentElement;
  }
  return null;
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 번들 상세 사진만 두 손가락으로 확대·이동(앱은 화면 전체 확대를 막아 둠, NativeShellViewport)
 * 확대 동안 사진 복제본을 화면 위에 띄워 카드의 둥근 틀에 잘리지 않게 하고, 손을 떼면 제자리로 돌아간 뒤 치움(인스타그램 방식)
 * 돌려준 callback ref를 사진 틀에 붙임(받는 중 화면 뒤에 틀이 생겨도 그때 연결)
 */
export function usePhotoPinchZoom() {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!root) return;
    let session:
      | {
          photo: HTMLImageElement;
          clone: HTMLImageElement;
          backdrop: HTMLDivElement;
          startDistance: number;
          startMid: Point;
          transform: string;
        }
      | undefined;

    const end = () => {
      if (!session) return;
      const { photo, clone, backdrop, transform } = session;
      session = undefined;
      const cleanup = () => {
        clone.remove();
        backdrop.remove();
        photo.style.removeProperty('visibility');
      };
      if (prefersReducedMotion() || typeof clone.animate !== 'function') {
        cleanup();
        return;
      }
      const options = { duration: RETURN_MS, easing: 'ease-out' };
      clone.animate([{ transform }, { transform: 'none' }], options);
      backdrop.animate([{ opacity: backdrop.style.opacity }, { opacity: '0' }], options);
      setTimeout(cleanup, RETURN_MS);
    };

    const start = (event: TouchEvent) => {
      if (session || event.touches.length !== 2) return;
      const [a, b] = [event.touches[0]!, event.touches[1]!];
      const photo = photoOf(a.target, root);
      if (!photo || photo !== photoOf(b.target, root)) return;
      event.preventDefault();
      const rect = photo.getBoundingClientRect();
      const startMid = midpoint(a, b);
      const backdrop = document.createElement('div');
      backdrop.setAttribute('aria-hidden', 'true');
      Object.assign(backdrop.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '40',
        background: 'black',
        opacity: '0',
        pointerEvents: 'none',
      });
      const clone = photo.cloneNode() as HTMLImageElement;
      clone.removeAttribute('loading');
      clone.alt = '';
      clone.setAttribute('aria-hidden', 'true');
      Object.assign(clone.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        objectFit: 'cover',
        zIndex: '41',
        pointerEvents: 'none',
        transformOrigin: `${startMid.x - rect.left}px ${startMid.y - rect.top}px`,
      });
      document.body.append(backdrop, clone);
      photo.style.visibility = 'hidden';
      session = {
        photo,
        clone,
        backdrop,
        startDistance: distance(a, b),
        startMid,
        transform: 'none',
      };
    };

    const move = (event: TouchEvent) => {
      if (!session) return;
      // 확대 중에는 페이지 스크롤·사진 넘김을 막음
      event.preventDefault();
      if (event.touches.length < 2) return;
      const [a, b] = [event.touches[0]!, event.touches[1]!];
      const scale = Math.min(Math.max(distance(a, b) / session.startDistance, 1), MAX_SCALE);
      const mid = midpoint(a, b);
      const transform = `translate(${mid.x - session.startMid.x}px, ${mid.y - session.startMid.y}px) scale(${scale})`;
      session.transform = transform;
      session.clone.style.transform = transform;
      session.backdrop.style.opacity = String(Math.min((scale - 1) * MAX_DIM, MAX_DIM));
    };

    const release = (event: TouchEvent) => {
      if (event.touches.length < 2) end();
    };

    // 확대 중 스크롤을 막아야 해 passive가 아닌 리스너
    root.addEventListener('touchstart', start, { passive: false });
    root.addEventListener('touchmove', move, { passive: false });
    // 손 떼기는 문서에서 받음(확대 중 사진이 다시 그려져 시작 노드가 빠져도 정리되게)
    document.addEventListener('touchend', release);
    document.addEventListener('touchcancel', release);
    return () => {
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', release);
      document.removeEventListener('touchcancel', release);
      end();
    };
  }, [root]);
  return setRoot;
}

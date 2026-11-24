'use client';

import { useEffect, useRef } from 'react';
import {
  ELLIPSES,
  LOOP_SECONDS,
  decodeDots,
  dotGroupFrame,
  ellipseFrame,
} from '../lib/backgroundMotion';
import { DOT_GRID, DOT_GROUPS } from '../lib/dotGroups';

// Figma 프레임(1440×900) 안 타원 자리·색·흐림(레이어 blur 150·200 = CSS blur 75·100). 순서는 ELLIPSES와 같음
const ELLIPSE_SHAPES = [
  {
    className: 'bg-primitive-bunch-100 blur-[75px]',
    left: -411,
    top: 758,
    width: 942,
    height: 197,
  },
  {
    className: 'bg-primitive-green-50 blur-[100px]',
    left: 1034,
    top: 716,
    width: 665,
    height: 231,
  },
  {
    className: 'bg-primitive-orange-100 blur-[100px]',
    left: 679,
    top: 787,
    width: 1045,
    height: 224,
  },
  { className: 'bg-primitive-pink-100 blur-[75px]', left: 199, top: 810, width: 930, height: 213 },
] as const;
const DOT_RADIUS = 4;
const DOTS = DOT_GROUPS.map(decodeDots);
const DOTS_WIDTH = DOT_GRID.columns * DOT_GRID.cell;
const DOTS_HEIGHT = DOT_GRID.rows * DOT_GRID.cell;
// PC 배치에서만 그림(모바일 안내에는 배경 없음, 숨긴 동안 반복을 돌리지 않음)
const WIDE_QUERY = '(min-width: 64rem)';
// Figma 프레임 폭 기준 가로 위치를 배경 폭 비율로(1440px보다 넓은 화면은 배경을 창 폭까지 늘림)
const toLayerWidth = (px: number) => `${(px / DOTS_WIDTH) * 100}%`;

/** PC 안내 화면 아래쪽 파스텔 타원과 점 패턴의 12초 반복(값·동작 기준은 AppInstallGuide.spec.md 「모션」) */
export function InstallGuideBackground() {
  const ellipseRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    // ponytail: 배율은 처음 한 번만 읽음, 다른 배율 모니터로 옮기면 점이 흐려질 수 있어 필요하면 resolution media query로 다시 잡기
    const scale = window.devicePixelRatio || 1;
    canvas.width = DOTS_WIDTH * scale;
    canvas.height = DOTS_HEIGHT * scale;
    context.scale(scale, scale);
    context.fillStyle = '#fff';

    const draw = (seconds: number) => {
      ELLIPSES.forEach((ellipse, index) => {
        const node = ellipseRefs.current[index];
        if (!node) return;
        const frame = ellipseFrame(ellipse, seconds);
        node.style.transform = `translate(${frame.x}px, ${frame.y}px) scale(${frame.scale})`;
        node.style.opacity = String(frame.opacity);
      });
      context.clearRect(0, 0, DOTS_WIDTH, DOTS_HEIGHT);
      DOTS.forEach((points, group) => {
        const frame = dotGroupFrame(group, seconds);
        context.globalAlpha = frame.opacity;
        context.beginPath();
        for (const { x, y } of points) {
          context.moveTo(x + frame.dx + DOT_RADIUS, y + frame.dy);
          context.arc(x + frame.dx, y + frame.dy, DOT_RADIUS, 0, Math.PI * 2);
        }
        context.fill();
      });
    };

    const wide = window.matchMedia(WIDE_QUERY);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 멈춘 동안의 시간은 빼고 이어서 재생
    let elapsed = 0;
    let lastTime: number | null = null;
    let frameId = 0;
    const tick = (time: number) => {
      if (lastTime !== null) elapsed = (elapsed + (time - lastTime) / 1000) % LOOP_SECONDS;
      lastTime = time;
      draw(elapsed);
      frameId = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frameId);
      lastTime = null;
      draw(elapsed);
      if (wide.matches && !reduced.matches && document.visibilityState === 'visible') {
        frameId = requestAnimationFrame(tick);
      }
    };
    sync();
    wide.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      cancelAnimationFrame(frameId);
      wide.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-1/2 -z-10 hidden h-225 w-full min-w-360 -translate-x-1/2 lg:block"
    >
      {ELLIPSE_SHAPES.map(({ className, left, top, width, height }, index) => (
        <div
          key={className}
          ref={(node) => {
            ellipseRefs.current[index] = node;
          }}
          className={`absolute rounded-full will-change-transform ${className}`}
          style={{ left: toLayerWidth(left), top, width: toLayerWidth(width), height }}
        />
      ))}
      <canvas ref={canvasRef} className="absolute bottom-0 left-0 h-auto w-full" />
    </div>
  );
}

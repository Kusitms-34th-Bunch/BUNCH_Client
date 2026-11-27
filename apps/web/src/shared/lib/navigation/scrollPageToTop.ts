import { cubicBezierEasing } from '@/shared/components/layout/easeOutIntegrator.internal';

// 브라우저 기본 smooth는 거리마다 속도가 달라 WebKit에서 시작·끝이 끊겨 보여 직접 움직임
// 순간 이동 없이 전체 거리를 감속 곡선으로(빠르게 출발해 맨 위에서 천천히 멈춤, Figma 눌림 모션 곡선, #583)
const ease = cubicBezierEasing([0.2, 0, 0, 1]);
// 거리에 비례한 시간: 한 화면 이내 350ms, 한 화면마다 50ms씩 늘려 650ms까지(먼 거리도 너무 빠르게 튀지 않게)
const durationFor = (screens: number) => Math.min(650, 350 + Math.max(0, screens - 1) * 50);

let stopRunning: (() => void) | undefined;

/**
 * 지금 화면(`PageShell`의 `main`)을 맨 위로. 탭 다시 누르기·피드 로고에서 씀(웹 막대·iOS 시스템 탭 바)
 * 전환 중 나가는 화면은 inert라 건너뜀. 동작 줄이기면 바로 이동, 움직이는 중 사용자가 직접 스크롤하면 멈춤
 */
export function scrollPageToTop() {
  const main = [...document.querySelectorAll('main')].findLast((el) => !el.closest('[inert]'));
  if (!main) return;
  stopRunning?.();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || main.scrollTop <= 0) {
    main.scrollTop = 0;
    return;
  }
  const from = main.scrollTop;
  const duration = durationFor(from / Math.max(1, main.clientHeight));
  const startedAt = performance.now();
  let frame = 0;
  // 손가락·휠·스크롤바 끌기·키보드 스크롤(PageDown·Space 등)
  const userInputs = ['touchstart', 'wheel', 'pointerdown', 'keydown'] as const;
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of userInputs) main.removeEventListener(type, stop);
    if (stopRunning === stop) stopRunning = undefined;
  };
  const step = (now: number) => {
    // 움직이는 중 화면을 떠났으면(전환 중 inert, 떼어짐) 더 쓰지 않음(나가는 화면의 스크롤 붙잡기와 겹치지 않게)
    if (!main.isConnected || main.closest('[inert]')) {
      stop();
      return;
    }
    const progress = Math.min(1, (now - startedAt) / duration);
    main.scrollTop = from * (1 - ease(progress));
    if (progress < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  for (const type of userInputs) main.addEventListener(type, stop, { passive: true });
  stopRunning = stop;
  frame = requestAnimationFrame(step);
}

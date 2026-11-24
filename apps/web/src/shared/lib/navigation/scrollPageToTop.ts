import { cubicBezierEasing } from '@/shared/components/layout/easeOutIntegrator.internal';

// 화면 전환(drill·slide)과 같은 시간·곡선. 브라우저 기본 smooth는 거리마다 속도가 달라 WebKit에서 시작·끝이 끊겨 보임
const DURATION_MS = 350;
const ease = cubicBezierEasing([0.4, 0, 0.2, 1]);
// 이 화면 수보다 멀면 한 화면 위치로 바로 옮긴 뒤 그만큼만 움직임(iOS 상태 바 탭처럼 거리와 관계없이 같은 시간)
const FAR_SCREENS = 2;

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
  if (main.scrollTop > main.clientHeight * FAR_SCREENS) main.scrollTop = main.clientHeight;
  const from = main.scrollTop;
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
    const progress = Math.min(1, (now - startedAt) / DURATION_MS);
    main.scrollTop = from * (1 - ease(progress));
    if (progress < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  for (const type of userInputs) main.addEventListener(type, stop, { passive: true });
  stopRunning = stop;
  frame = requestAnimationFrame(step);
}

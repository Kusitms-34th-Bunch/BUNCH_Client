/**
 * 지금 화면(`PageShell`의 `main`)을 맨 위로. 탭을 다시 누를 때 씀(웹 막대·iOS 시스템 탭 바)
 * 전환 중 나가는 화면은 inert라 건너뜀. 동작 줄이기면 바로 이동
 */
export function scrollPageToTop() {
  const main = [...document.querySelectorAll('main')].findLast((el) => !el.closest('[inert]'));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  main?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

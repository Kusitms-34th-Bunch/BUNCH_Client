import { type RefObject, useLayoutEffect, useRef } from 'react';

// 밑줄 이동(MenuTabs.List 250ms ease-out)과 같은 값: 패널이 밑줄과 한 덩어리로 움직이게
const TAB_SLIDE_MS = 250;
const EASING = 'ease-out';

/** 패널에 붙임: 나가는 패널(Base UI가 바로 `inert`로 둠)을 겹쳐 두어 새 패널을 아래로 밀어내지 않게 */
export const TAB_SLIDE_PANEL_CLASS = 'inert:absolute inert:inset-x-0 inert:top-0';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 탭 패널 좌우 밀기(인스타 프로필 그리드 ↔ 릴스, motion.md). `begin`으로 방향을 적은 뒤 `tabKey`가 바뀌면 두 패널을 밈
 * 나가는 패널은 Base UI가 애니메이션이 끝날 때까지 남겨 두므로 복제하지 않고 그 패널을 그대로 밀어냄
 */
export function useTabSlideMotion(containerRef: RefObject<HTMLElement | null>, tabKey: string) {
  // 1은 오른쪽 탭으로(새 패널이 오른쪽에서 들어옴), 0은 밀지 않음
  const direction = useRef<1 | -1 | 0>(0);

  /** 탭을 바꾸기 직전에 방향을 적음 */
  const begin = (next: 1 | -1) => {
    direction.current = next;
  };

  useLayoutEffect(() => {
    const step = direction.current;
    direction.current = 0;
    // data-ending-style은 다음 프레임에 지워져 빠르게 되돌리면 두 패널에 함께 남으므로 바로 반영되는 inert로 판단
    const panel = containerRef.current?.querySelector<HTMLElement>(
      ':scope > [role="tabpanel"]:not([inert])',
    );
    const container = panel?.parentElement;
    // Web Animations를 모르는 환경(테스트 DOM 등)은 모션 없이 바로 바뀜
    if (!step || !panel || !container || prefersReducedMotion()) return;
    if (typeof panel.animate !== 'function') return;
    const outgoing = container.querySelector<HTMLElement>(':scope > [role="tabpanel"][inert]');
    const options = { duration: TAB_SLIDE_MS, easing: EASING };
    // 밀리는 동안만 옆으로 나간 부분을 자름(평소에는 카드 그림자 등을 자르지 않게)
    // clip: 스크롤 틀이 되지 않아 밀리는 중 Tab 초점이 틀을 가로로 스크롤하지 않음
    container.style.overflow = 'clip';
    // 나가는 패널이 겹쳐 흐름에서 빠져도 밀리는 동안은 그 높이를 지켜 페이지가 갑자기 줄지 않게
    if (outgoing) container.style.minHeight = `${outgoing.offsetHeight}px`;
    const animations = [
      panel.animate(
        [{ transform: `translateX(${step * 100}%)` }, { transform: 'translateX(0)' }],
        options,
      ),
    ];
    if (outgoing) {
      animations.push(
        // 끝난 뒤 Base UI가 치우기 전 한 프레임 제자리로 돌아오지 않게 끝 위치 유지(cleanup의 cancel이 풂)
        outgoing.animate(
          [{ transform: 'translateX(0)' }, { transform: `translateX(${-step * 100}%)` }],
          { ...options, fill: 'forwards' },
        ),
      );
    }
    let cleared = false;
    const clear = () => {
      if (cleared) return;
      cleared = true;
      container.style.removeProperty('overflow');
      container.style.removeProperty('min-height');
    };
    void Promise.all(animations.map((animation) => animation.finished)).then(clear, clear);
    // 다음 전환이 오거나 화면을 떠나면 진행 중인 밀기를 끝냄
    return () => {
      for (const animation of animations) animation.cancel();
      clear();
    };
  }, [tabKey, containerRef]);

  return { begin };
}

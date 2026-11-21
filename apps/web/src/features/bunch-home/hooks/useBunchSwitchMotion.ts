import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

// 인스타 계정 전환 실측(약 330ms): 지금 화면은 왼쪽으로 밀려 나가고, 새 화면은 90% 둥근 카드로 오른쪽에서 들어와 커짐
// 맞는 SSGOI 프리셋이 없고(drill은 더보기 진입과 같아 보이고 film은 세로) SSGOI 7은 화면 안 전환이 없어 Web Animations로 직접 정의(motion.md)
export const BUNCH_SWITCH_MS = 330;
const ENTER_SCALE = 0.9;
const CARD_RADIUS = '1.5rem';
// 늦게 그려지거나 같은 번치로 끝나 새 화면이 오지 않으면 복제본을 치우는 상한(기다리는 동안 화면 입력이 막히므로 짧게)
const SNAPSHOT_CAP_MS = 3000;
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 번치 전환 모션: `begin`이 지금 화면을 복제해 고정(받는 동안 유지), 새 번치가 그려지면 복제본은 왼쪽으로·새 화면은 카드로 들어와 커짐
 * 실패하면 `cancel`. 동작 줄이기 설정이면 복제하지 않음(화면의 기존 디졸브만)
 */
export function useBunchSwitchMotion(anchorRef: RefObject<HTMLElement | null>, bunchId: string) {
  const snapshot = useRef<{ clone: HTMLElement; timer: ReturnType<typeof setTimeout> } | null>(
    null,
  );

  const cancel = () => {
    if (!snapshot.current) return;
    clearTimeout(snapshot.current.timer);
    snapshot.current.clone.remove();
    snapshot.current = null;
  };

  const begin = () => {
    cancel();
    // PageShell 바깥 요소(헤더 포함 화면 전체)
    const root = anchorRef.current?.closest<HTMLElement>('[data-app-background]');
    // Web Animations를 모르는 환경(테스트 DOM 등)은 모션 없이 바로 바뀜
    if (!root || prefersReducedMotion() || typeof root.animate !== 'function') return;
    const rect = root.getBoundingClientRect();
    const clone = root.cloneNode(true) as HTMLElement;
    // 상태 바 색 판단·보조기술·초점에서 빼고 같은 id가 두 개 생기지 않게
    clone.removeAttribute('data-app-background');
    clone.removeAttribute('data-app-background-bottom');
    for (const element of clone.querySelectorAll('[id]')) element.removeAttribute('id');
    // inert는 hit-test에서 빠져 터치가 아래 화면으로 지나가므로 쓰지 않고 초점만 막음
    for (const element of clone.querySelectorAll<HTMLElement>(FOCUSABLE)) element.tabIndex = -1;
    clone.setAttribute('aria-hidden', 'true');
    clone.dataset.bunchSwitchSnapshot = '';
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      // 기다리는 동안 보이지 않는 아래 화면이 터치·스크롤을 받지 않게 복제본이 받아 막음
      pointerEvents: 'auto',
    });
    root.before(clone);
    // 복제는 스크롤 위치를 옮기지 않아 보던 자리 그대로 보이게 맞춤
    const scrolled = root.querySelector('main');
    const cloneMain = clone.querySelector('main');
    if (scrolled && cloneMain) cloneMain.scrollTop = scrolled.scrollTop;
    snapshot.current = { clone, timer: setTimeout(cancel, SNAPSHOT_CAP_MS) };
  };

  // 기다리는 사이 화면이 사라지면(새 번치를 받지 못해 오류·로딩 화면으로 바뀜) 붙잡은 화면도 치움
  useEffect(
    () => () => {
      if (!snapshot.current) return;
      clearTimeout(snapshot.current.timer);
      snapshot.current.clone.remove();
      snapshot.current = null;
    },
    [],
  );

  // 새 번치가 그려진 직후(그리기 전) 두 화면을 함께 움직임
  useLayoutEffect(() => {
    const current = snapshot.current;
    const root = anchorRef.current?.closest<HTMLElement>('[data-app-background]');
    if (!current || !root) return;
    clearTimeout(current.timer);
    snapshot.current = null;
    const { clone } = current;
    const easing = 'cubic-bezier(0.25, 0.8, 0.25, 1)';
    // 새 화면을 복제본 위로(카드가 나가는 화면을 덮으며 들어옴)
    const restore = {
      position: root.style.position,
      zIndex: root.style.zIndex,
      overflow: root.style.overflow,
    };
    Object.assign(root.style, { position: 'relative', zIndex: '1', overflow: 'hidden' });
    const enter = root.animate(
      [
        { transform: `translateX(100%) scale(${ENTER_SCALE})`, borderRadius: CARD_RADIUS },
        {
          transform: `translateX(0) scale(${ENTER_SCALE})`,
          borderRadius: CARD_RADIUS,
          offset: 0.6,
        },
        { transform: 'none', borderRadius: '0' },
      ],
      { duration: BUNCH_SWITCH_MS, easing },
    );
    // 밀려 난 만큼 잘라 원래 자리 안쪽만 보임(앱 폭이 화면보다 좁은 큰 화면에서 바깥에 비치지 않게)
    const leave = clone.animate(
      [
        { transform: 'none', clipPath: 'inset(0 0 0 0)' },
        { transform: 'translateX(-100%)', clipPath: 'inset(0 0 0 100%)' },
      ],
      { duration: BUNCH_SWITCH_MS, easing },
    );
    // 한 번만(취소된 애니메이션의 늦은 완료가 다음 전환이 건 스타일을 되돌리지 않게)
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clone.remove();
      Object.assign(root.style, restore);
    };
    void Promise.allSettled([enter.finished, leave.finished]).then(finish);
    return () => {
      enter.cancel();
      leave.cancel();
      finish();
    };
  }, [anchorRef, bunchId]);

  return { begin, cancel };
}

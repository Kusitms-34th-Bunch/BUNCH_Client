import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';
import { appBridge, hasNativeMethod, nativeShellTab } from '@/shared/bridge/client';

// 인스타 계정 전환 녹화(2026-11-23) 기준: 지금 화면은 왼쪽으로 나가고 새 화면이 92% 둥근 카드로 들어온 뒤(앞 36%) 커짐
// iOS 쉘은 상태 바·시스템 탭 바까지 쉘이 네이티브로 움직임. 맞는 SSGOI 프리셋이 없어 Web Animations로 직접 정의(motion.md)
export const BUNCH_SWITCH_MS = 470;
const SLIDE_PART = 0.36;
const ENTER_SCALE = 0.92;
const CARD_RADIUS = '1.5rem';
// 늦게 그려지거나 같은 번치로 끝나 새 화면이 오지 않으면 복제본을 치우는 상한(기다리는 동안 화면 입력이 막히므로 짧게)
const SNAPSHOT_CAP_MS = 3000;
// 시트에서 골랐으면 시트가 다 닫힌 뒤 쉘이 화면을 찍게 기다리는 최대 시간(닫히는 시트가 사진에 남지 않게)
const SHEET_CLOSE_WAIT_MS = 500;
// 쉘이 덮기에 답하지 않아도 전환을 진행하는 상한(그동안 전환이 멈추지 않게)
const COVER_WAIT_CAP_MS = 1000;

// 쉘 화면 전체 전환의 진행: 시트 닫힘 대기 → 덮음 → 끝 알림. aborted면 덮이는 즉시 치움
type NativeCover = { stage: 'waiting' | 'covered' | 'finishing'; aborted: boolean };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 번치 전환 모션: `begin`이 지금 화면을 복제해 고정(받는 동안 유지), 새 번치가 그려지면 복제본은 왼쪽으로·새 화면은 카드로 들어와 커짐
 * 실패하면 `cancel`. 동작 줄이기 설정이면 복제하지 않음(화면의 기존 디졸브만)
 */
type Snapshot = { clone: HTMLElement; root: HTMLElement; timer: ReturnType<typeof setTimeout> };

// PageShell 바깥 요소(헤더 포함 화면 전체). 기준이 화면 안이면 위로, 화면을 감싼 바깥이면 안에서 찾음
const findScreenRoot = (anchor: HTMLElement | null) =>
  anchor?.closest<HTMLElement>('[data-page-shell]') ??
  anchor?.querySelector<HTMLElement>('[data-page-shell]') ??
  null;

// 기다리기를 끝냄: 상한 타이머를 풀고 원래 화면이 다시 터치를 받게 함
const stopWaiting = ({ root, timer }: Snapshot) => {
  clearTimeout(timer);
  root.style.removeProperty('pointer-events');
};

export function useBunchSwitchMotion(anchorRef: RefObject<HTMLElement | null>, bunchId: string) {
  const snapshot = useRef<Snapshot | null>(null);
  // iOS 쉘이 화면 전체를 덮는 전환(새 번치가 그려지면 쉘에 끝을 알림)
  const nativeCover = useRef<NativeCover | null>(null);

  // 쉘 전환을 버림: 이미 덮였으면 치우고, 아직이면 덮이는 즉시 치우게 표시
  const abortNative = () => {
    const current = nativeCover.current;
    nativeCover.current = null;
    if (!current) return;
    current.aborted = true;
    if (current.stage === 'covered') void appBridge.cancelScreenSwitch().catch(() => {});
  };

  const cancel = () => {
    abortNative();
    if (!snapshot.current) return;
    stopWaiting(snapshot.current);
    snapshot.current.clone.remove();
    snapshot.current = null;
  };

  // 쉘이 화면을 덮은 뒤(덮지 못했거나 웹 복제면 바로) 끝남. 덮기 전에 번치가 바뀌면 모션 없이 바뀌므로 부르는 쪽이 기다렸다 바꿈
  const begin = (): Promise<void> => {
    cancel();
    if (!prefersReducedMotion() && hasNativeMethod('beginScreenSwitch')) {
      const current: NativeCover = { stage: 'waiting', aborted: false };
      nativeCover.current = current;
      const startedAt = performance.now();
      let settle = () => {};
      const settled = new Promise<void>((resolve) => {
        settle = resolve;
        setTimeout(resolve, COVER_WAIT_CAP_MS);
      });
      const cover = () => {
        if (current.aborted) {
          settle();
          return;
        }
        if (
          document.querySelector('[data-bottom-sheet]') !== null &&
          performance.now() - startedAt < SHEET_CLOSE_WAIT_MS
        ) {
          requestAnimationFrame(cover);
          return;
        }
        void appBridge
          .beginScreenSwitch(nativeShellTab())
          .catch(() => false)
          .then((covered) => {
            if (!covered) {
              if (nativeCover.current === current) nativeCover.current = null;
              return;
            }
            // 덮는 사이 새 번치가 먼저 그려졌거나 취소됐으면 움직이지 않고 치움
            if (current.aborted) void appBridge.cancelScreenSwitch().catch(() => {});
            else current.stage = 'covered';
          })
          .finally(settle);
      };
      cover();
      return settled;
    }
    const root = findScreenRoot(anchorRef.current);
    // Web Animations를 모르는 환경(테스트 DOM 등)은 모션 없이 바로 바뀜
    if (!root || prefersReducedMotion() || typeof root.animate !== 'function')
      return Promise.resolve();
    const rect = root.getBoundingClientRect();
    const copy = root.cloneNode(true) as HTMLElement;
    // 상태 바 색 판단에서 빼고 같은 id가 두 개 생기지 않게. inert로 링크·버튼 동작과 초점을 막음
    copy.removeAttribute('data-app-background');
    copy.removeAttribute('data-app-background-bottom');
    // 화면 찾기가 복제본을 새 화면으로 잡지 않게(복제본은 원래 화면 앞에 들어감)
    copy.removeAttribute('data-page-shell');
    for (const element of copy.querySelectorAll('[id]')) element.removeAttribute('id');
    copy.inert = true;
    Object.assign(copy.style, { width: '100%', height: '100%', margin: '0' });
    // inert는 터치를 아래로 통과시키므로 바깥 틀이 받아 막음(위에 그려지게 zIndex)
    const clone = document.createElement('div');
    clone.setAttribute('aria-hidden', 'true');
    clone.dataset.bunchSwitchSnapshot = '';
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      zIndex: '1',
      pointerEvents: 'auto',
    });
    clone.append(copy);
    root.before(clone);
    // 복제는 스크롤 위치를 옮기지 않아 보던 자리 그대로 보이게 맞춤
    const scrolled = root.querySelector('main');
    const cloneMain = clone.querySelector('main');
    if (scrolled && cloneMain) cloneMain.scrollTop = scrolled.scrollTop;
    // 원래 화면 안의 z-index 요소(「+」 등)는 복제본보다 위라 원래 화면이 터치를 받지 않게 함(초점은 그대로)
    root.style.pointerEvents = 'none';
    snapshot.current = { clone, root, timer: setTimeout(cancel, SNAPSHOT_CAP_MS) };
    return Promise.resolve();
  };

  // 기다리는 사이 화면이 사라지면(새 번치를 받지 못해 오류·로딩 화면으로 바뀜) 붙잡은 화면도 치움
  useEffect(
    () => () => {
      abortNative();
      if (!snapshot.current) return;
      stopWaiting(snapshot.current);
      snapshot.current.clone.remove();
      snapshot.current = null;
    },
    [],
  );

  // 새 번치가 그려진 직후(그리기 전) 두 화면을 함께 움직임
  useLayoutEffect(() => {
    // 쉘이 덮었으면 새 화면이 실제로 그려진 뒤(두 프레임) 쉘이 움직임. 아직 덮기 전이면 모션 없이 바뀜
    const native = nativeCover.current;
    if (native) {
      if (native.stage !== 'covered') {
        abortNative();
        return;
      }
      native.stage = 'finishing';
      nativeCover.current = null;
      let sent = false;
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          sent = true;
          void appBridge.finishScreenSwitch().catch(() => {});
        });
      });
      // 알리기 전에 정리되면(화면이 사라짐) 덮개를 남기지 않게 취소
      return () => {
        cancelAnimationFrame(frame);
        if (!sent) void appBridge.cancelScreenSwitch().catch(() => {});
      };
    }
    const current = snapshot.current;
    const root = findScreenRoot(anchorRef.current);
    if (!current || !root) return;
    stopWaiting(current);
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
          offset: SLIDE_PART,
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

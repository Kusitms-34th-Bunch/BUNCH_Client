import { useEffect, useRef, useState, type RefObject } from 'react';

/** 손가락 이동에 곱하는 저항. 내용은 손가락보다 덜 움직여 고무줄처럼 당겨짐 */
const RESISTANCE = 0.6;
/** 내용이 내려와 머무는 거리이자 새로고침을 시작하는 기준(Figma `6673:45283`은 80px, 간격이 넓어 줄임) */
export const PULL_THRESHOLD_PX = 64;
const PULL_MAX_PX = 72;
/** 이 거리보다 적게 움직인 터치는 탭·스크롤로 보고 당김으로 취급하지 않음 */
const START_SLOP_PX = 8;
/** 열리고 닫히는 시간(Figma 3.5초 타임라인의 0.6초 구간). 곡선은 globals.css의 `.pull-refresh` */
const SETTLE_MS = 600;
/** 새로고침이 순식간에 끝나도 표시가 깜빡이지 않도록 열린 채 유지하는 최소 시간 */
const MIN_REFRESH_MS = 600;
/** 표시기의 위치와 크기(globals.css `.pull-refresh-indicator`, `RefreshSpark`와 같아야 함). 스크롤로 내용이 표시기 자리를 덮는 만큼 표시기를 흐리게 하는 계산에 씀 */
const INDICATOR_TOP_PX = 20;
const INDICATOR_SIZE_PX = 36;
/** 「새로고침을 마쳤어요」 안내를 남겨 두는 시간 */
const DONE_MESSAGE_MS = 3000;

export type PullStatus = 'idle' | 'refreshing' | 'done';

type UsePullToRefreshOptions = {
  /** `--pull-y`·`--pull-p`를 받아 내용과 표시기를 움직이는 바깥 요소 */
  containerRef: RefObject<HTMLElement | null>;
  /** 스크롤하는 요소(맨 위에서만 당김이 시작됨) */
  scrollRef: RefObject<HTMLElement | null>;
  /** 새로고침 동작. 끝날 때까지 표시가 열려 있음. 실패해도 닫으며 오류 안내는 호출하는 화면이 맡음 */
  onRefresh: (() => Promise<unknown> | void) | undefined;
  /** 선택 모드·저장 중처럼 당김이 다른 조작과 겹치는 동안 끔 */
  disabled?: boolean | undefined;
};

/**
 * 맨 위에서 아래로 당겼다 놓으면 새로고침하는 터치 제스처
 * 움직임은 React 상태가 아니라 컨테이너의 CSS 변수로 직접 써서 당기는 동안 다시 그리지 않음
 * 마우스·키보드에는 반응하지 않으며, 화면은 진입·앱 복귀 때도 새로 받으므로 같은 동작을 다른 수단으로 얻을 수 있음
 */
export function usePullToRefresh({
  containerRef,
  scrollRef,
  onRefresh,
  disabled = false,
}: UsePullToRefreshOptions): { status: PullStatus } {
  const [status, setStatus] = useState<PullStatus>('idle');
  // 이벤트 리스너를 다시 달지 않고 최신 값을 읽기 위한 ref
  const refreshRef = useRef(onRefresh);
  const busyRef = useRef(false);
  useEffect(() => {
    refreshRef.current = onRefresh;
  });

  const enabled = !disabled && onRefresh !== undefined;

  useEffect(() => {
    const container = containerRef.current;
    const scroller = scrollRef.current;
    if (!enabled || !container || !scroller) return;

    // 이 effect가 정리된 뒤(꺼짐·화면 이탈) 늦게 끝난 새로고침이 상태를 건드리지 않게 함
    let alive = true;
    let timer = 0;
    let doneTimer = 0;
    let tracking = false;
    let pulling = false;
    let startX = 0;
    let startY = 0;
    let baseY = 0;
    // 이번 당김에서 기준 거리에 한 번이라도 닿았는지(그 뒤에 내용을 위로 올려도 놓으면 새로고침함)
    let reached = false;
    let offset = 0;

    const apply = (px: number) => {
      offset = px;
      container.style.setProperty('--pull-y', `${px}px`);
      container.style.setProperty('--pull-p', String(Math.min(px / PULL_THRESHOLD_PX, 1)));
    };
    const reset = () => {
      container.removeAttribute('data-pull');
      container.removeAttribute('data-pull-settling');
      container.style.removeProperty('--pull-y');
      container.style.removeProperty('--pull-p');
      container.style.removeProperty('--pull-fade');
      offset = 0;
    };
    const close = (after?: () => void) => {
      container.setAttribute('data-pull-settling', 'close');
      apply(0);
      timer = window.setTimeout(() => {
        reset();
        after?.();
      }, SETTLE_MS);
    };

    const scrollToTop = () => {
      if (scroller.scrollTop <= 0) return;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (typeof scroller.scrollTo === 'function') {
        scroller.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      } else {
        scroller.scrollTop = 0;
      }
    };

    // 끝나면 간격을 닫으면서 내용을 항상 최상단(스크롤 0, 간격 0)으로 올림
    // 새로고침 중에 목록을 스크롤했어도 끝난 뒤에는 첫 위치에서 시작하도록 스크롤도 함께 맨 위로 보냄
    const finish = () => {
      scrollToTop();
      close(() => {
        busyRef.current = false;
        setStatus('done');
        // 알림 문구가 영구히 남아 가상 커서가 매번 읽지 않게 잠시 뒤 비움
        doneTimer = window.setTimeout(() => setStatus('idle'), DONE_MESSAGE_MS);
      });
    };

    const refresh = async () => {
      busyRef.current = true;
      setStatus('refreshing');
      container.setAttribute('data-pull-settling', 'open');
      apply(PULL_THRESHOLD_PX);
      const startedAt = Date.now();
      try {
        await refreshRef.current?.();
      } catch {
        // 오류 안내는 화면의 몫. 표시만 닫음
      }
      if (!alive) return;
      const rest = Math.max(0, MIN_REFRESH_MS - (Date.now() - startedAt));
      timer = window.setTimeout(finish, rest);
    };

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (busyRef.current || event.touches.length !== 1 || !touch || scroller.scrollTop > 0) return;
      window.clearTimeout(timer);
      window.clearTimeout(doneTimer);
      setStatus((current) => (current === 'done' ? 'idle' : current));
      reset();
      tracking = true;
      pulling = false;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.touches[0];
      // 안쪽 요소가 이미 이 이동을 쓰고 있으면(사진함의 길게 눌러 쓸어 선택 등) 당김으로 가져가지 않음
      // 당기는 중에는 목록을 이 hook이 직접 스크롤하므로 스크롤 여부는 당기기 전에만 봄
      if (
        event.defaultPrevented ||
        event.touches.length !== 1 ||
        !touch ||
        (!pulling && scroller.scrollTop > 0)
      ) {
        tracking = false;
        if (pulling) {
          pulling = false;
          close();
          scrollToTop();
        }
        return;
      }
      const dy = touch.clientY - startY;
      if (!pulling) {
        // 위로 밀거나 가로로 더 움직이면 스크롤·가로 넘기기에 양보
        if (dy < 0 || Math.abs(touch.clientX - startX) > dy) {
          if (dy < 0 || dy >= START_SLOP_PX) tracking = false;
          return;
        }
        if (dy < START_SLOP_PX) return;
        pulling = true;
        reached = false;
        baseY = touch.clientY;
        container.setAttribute('data-pull', '');
        container.removeAttribute('data-pull-settling');
      }
      // 당기는 동안 목록이 같이 끌려 올라가지 않게 기본 스크롤을 막음
      if (event.cancelable) event.preventDefault();
      const delta = touch.clientY - baseY;
      // 당기기 시작한 자리보다 손가락을 위로 올리면 기본 스크롤은 막혀 있으니 목록을 그만큼 직접 스크롤해, 내용이 로딩 영역 위로 올라와 헤더 밑으로 들어가게 함
      // 놓으면 최상단으로 돌아옴
      scroller.scrollTop = Math.max(0, -delta);
      apply(Math.min(PULL_MAX_PX, Math.max(0, delta * RESISTANCE)));
      if (offset >= PULL_THRESHOLD_PX) reached = true;
    };

    // 시스템 제스처·알림으로 터치가 끊기면 놓은 것이 아니므로 기준을 넘었어도 새로고침하지 않고 닫음
    const onCancel = () => {
      if (!tracking) return;
      tracking = false;
      if (!pulling) return;
      pulling = false;
      close();
      scrollToTop();
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (!pulling) return;
      pulling = false;
      if (reached || offset >= PULL_THRESHOLD_PX) {
        void refresh();
        // 헤더 밑까지 올려 둔 채 놓았다면 최상단으로 돌려 간격과 함께 열림
        scrollToTop();
      } else {
        close();
        scrollToTop();
      }
    };

    // 새로고침 중에 스크롤하면 내용이 표시기 자리를 덮고 올라오므로, 덮이는 만큼 표시기를 흐리게 해 카드 사이 틈으로 비치지 않게 함
    const onScroll = () => {
      if (busyRef.current && offset > 0) {
        const visible = (offset - scroller.scrollTop - INDICATOR_TOP_PX) / INDICATOR_SIZE_PX;
        container.style.setProperty('--pull-fade', String(Math.min(1, Math.max(0, visible))));
      }
    };

    scroller.addEventListener('touchstart', onStart, { passive: true });
    scroller.addEventListener('scroll', onScroll, { passive: true });
    // preventDefault로 기본 스크롤을 막아야 해서 passive가 아님
    scroller.addEventListener('touchmove', onMove, { passive: false });
    scroller.addEventListener('touchend', onEnd);
    scroller.addEventListener('touchcancel', onCancel);
    return () => {
      window.clearTimeout(timer);
      scroller.removeEventListener('touchstart', onStart);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('touchmove', onMove);
      scroller.removeEventListener('touchend', onEnd);
      scroller.removeEventListener('touchcancel', onCancel);
      alive = false;
      window.clearTimeout(doneTimer);
      reset();
      busyRef.current = false;
      // 새로고침 중에 꺼지거나 화면이 사라져도 표시가 도는 채로 남지 않게 함
      setStatus('idle');
    };
  }, [containerRef, scrollRef, enabled]);

  return { status };
}

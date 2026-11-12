import { useEffect, useRef, useState, type RefObject } from 'react';

/** 손가락 이동에 곱하는 저항. 내용은 손가락보다 덜 움직여 고무줄처럼 당겨짐 */
const RESISTANCE = 0.6;
/** 내용이 내려오는 거리(Figma `6673:45283` 80px)이자 놓았을 때 새로고침을 시작하는 기준 */
export const PULL_THRESHOLD_PX = 80;
const PULL_MAX_PX = 120;
/** 이 거리보다 적게 움직인 터치는 탭·스크롤로 보고 당김으로 취급하지 않음 */
const START_SLOP_PX = 8;
/** 열리고 닫히는 시간(Figma 3.5초 타임라인의 0.6초 구간). 곡선은 globals.css의 `.pull-refresh` */
const SETTLE_MS = 600;
/** 새로고침이 순식간에 끝나도 표시가 깜빡이지 않도록 열린 채 유지하는 최소 시간 */
const MIN_REFRESH_MS = 600;
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
      timer = window.setTimeout(() => {
        close(() => {
          busyRef.current = false;
          setStatus('done');
          // 알림 문구가 영구히 남아 가상 커서가 매번 읽지 않게 잠시 뒤 비움
          doneTimer = window.setTimeout(() => setStatus('idle'), DONE_MESSAGE_MS);
        });
      }, rest);
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
      if (
        event.defaultPrevented ||
        event.touches.length !== 1 ||
        !touch ||
        scroller.scrollTop > 0
      ) {
        tracking = false;
        if (pulling) {
          pulling = false;
          close();
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
        baseY = touch.clientY;
        container.setAttribute('data-pull', '');
        container.removeAttribute('data-pull-settling');
      }
      // 당기는 동안 목록이 같이 끌려 올라가지 않게 기본 스크롤을 막음
      if (event.cancelable) event.preventDefault();
      apply(Math.min(PULL_MAX_PX, Math.max(0, (touch.clientY - baseY) * RESISTANCE)));
    };

    // 시스템 제스처·알림으로 터치가 끊기면 놓은 것이 아니므로 기준을 넘었어도 새로고침하지 않고 닫음
    const onCancel = () => {
      if (!tracking) return;
      tracking = false;
      if (!pulling) return;
      pulling = false;
      close();
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (!pulling) return;
      pulling = false;
      if (offset >= PULL_THRESHOLD_PX) void refresh();
      else close();
    };

    scroller.addEventListener('touchstart', onStart, { passive: true });
    // preventDefault로 기본 스크롤을 막아야 해서 passive가 아님
    scroller.addEventListener('touchmove', onMove, { passive: false });
    scroller.addEventListener('touchend', onEnd);
    scroller.addEventListener('touchcancel', onCancel);
    return () => {
      window.clearTimeout(timer);
      scroller.removeEventListener('touchstart', onStart);
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

'use client';

import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

// 스크롤이 이만큼 멈추면 반쯤 걸친 헤더를 끝까지 넣거나 꺼냄(관성 스크롤 중에는 이벤트가 계속 와서 기다림)
const SETTLE_DELAY_MS = 120;
// 정리 이동 200ms ease-out(진입·이탈). 손가락을 따라가는 동안에는 전환 없음
const SETTLE_TRANSITION = 'transform 200ms cubic-bezier(0, 0, 0.2, 1)';
const HIDDEN_TRANSFORM = 'calc(-100% - 2px)';
// 숨은 헤더는 위로 이만큼 올린 뒤부터 따라 내려옴(Instagram처럼 조금 올렸다고 바로 나오지 않게). 아래로 내리면 다시 셈
const REVEAL_DISTANCE = 60;

type Options = {
  scrollRef: RefObject<HTMLElement | null>;
  /** 움직일 헤더(상태 표시줄 자리 포함). 높이는 `containerRef`에 `--page-header-height`로 씀 */
  headerRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
};

/**
 * 스크롤한 만큼 헤더를 밀어 올리거나 내림(손가락을 1:1로 따라감, Facebook·Safari 방식). 스크롤이 멈추면 절반 기준으로 끝까지 넣거나 꺼냄
 * 맨 위에서는 스크롤한 거리만큼만 숨어 위로 갈수록 따라 나옴. 사용자가 스크롤을 시작하기 전의 이동(스크롤 복원)은 무시
 * 헤더 안에 초점이 있으면 숨기지 않음. 위치는 style로 직접 바꿔 스크롤 중 다시 그리지 않고, 다 숨었는지만 돌려줌(inert용)
 */
export function useHideOnScroll({ scrollRef, headerRef, containerRef, enabled }: Options) {
  const [hidden, setHidden] = useState(false);

  // 첫 화면을 그리기 전에 재서 본문이 헤더 밑에 잠깐 가렸다 밀리지 않게
  useLayoutEffect(() => {
    const header = headerRef.current;
    const container = containerRef.current;
    if (!enabled || !header || !container) return;
    const measure = () =>
      container.style.setProperty('--page-header-height', `${header.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    // 상태 표시줄 여백(padding)이 바뀌어도 다시 재도록 테두리 상자 기준
    observer.observe(header, { box: 'border-box' });
    return () => {
      observer.disconnect();
      container.style.removeProperty('--page-header-height');
    };
  }, [enabled, headerRef, containerRef]);

  useEffect(() => {
    const scroller = scrollRef.current;
    const header = headerRef.current;
    if (!enabled || !scroller || !header) return;
    // 화면에 있는 동안 설정을 바꿔도 따르도록 움직일 때마다 읽음
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let userScrolled = false;
    let last = scroller.scrollTop;
    // 헤더가 위로 밀려 올라간 거리(0이면 다 보임, 높이면 다 숨음)
    let offset = 0;
    // 숨은 상태에서 위로 올린 거리(아래로 내리면 0)
    let upward = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const apply = (next: number, animate: boolean) => {
      const height = header.offsetHeight;
      // 스크롤 값이 소수(iOS 0.33px 단위)라 거의 다 숨은 상태는 다 숨은 것으로 봄(아래 끝이 1px 미만으로 남지 않게)
      offset = next >= height - 1 ? height : next;
      header.style.transition = animate && !motionQuery.matches ? SETTLE_TRANSITION : 'none';
      // 다 숨으면 잰 높이 대신 자기 높이 + 2px만큼 올려 반올림한 높이로 생기는 틈도 없앰
      if (offset === 0) header.style.transform = '';
      else if (offset === height) header.style.transform = `translateY(${HIDDEN_TRANSFORM})`;
      else header.style.transform = `translateY(${-offset}px)`;
      setHidden(offset > 0 && offset === height);
    };
    const settle = () => {
      const height = header.offsetHeight;
      if (offset === 0 || offset === height) return;
      // 맨 위 근처는 끝까지 숨길 수 없으므로 꺼내고, 헤더 안에 초점이 있으면 숨기지 않음
      const hide =
        offset > height / 2 &&
        scroller.scrollTop >= height &&
        !header.contains(document.activeElement);
      // 다시 다 숨으면 위로 올린 거리도 처음부터 셈(REVEAL_DISTANCE 기준 유지)
      if (hide) upward = 0;
      apply(hide ? height : 0, true);
    };
    // 헤더 안으로 초점이 들어오면 바로 꺼냄(예약된 정리로 숨어 inert가 되지 않게)
    const onFocusIn = () => {
      clearTimeout(settleTimer);
      if (offset !== 0) apply(0, true);
    };
    // 손가락이 화면에 닿아 있는 동안은 멈춰 있어도 정리하지 않음(놓은 뒤 관성까지 끝나면 정리)
    let touching = false;
    const scheduleSettle = () => {
      clearTimeout(settleTimer);
      if (!touching) settleTimer = setTimeout(settle, SETTLE_DELAY_MS);
    };
    const markUser = () => {
      userScrolled = true;
    };
    const onTouchStart = () => {
      userScrolled = true;
      touching = true;
      clearTimeout(settleTimer);
    };
    const onTouchEnd = () => {
      touching = false;
      scheduleSettle();
    };
    const onScroll = () => {
      const y = Math.max(0, scroller.scrollTop);
      const delta = y - last;
      last = y;
      // 사용자 조작 전 이동(스크롤 복원)은 기준 위치만 옮김
      if (!userScrolled) return;
      const height = header.offsetHeight;
      const keepShown = header.contains(document.activeElement);
      // 위로 올릴 때는 REVEAL_DISTANCE를 넘긴 만큼만 내려옴(이미 일부 보이는 헤더는 바로 따라옴)
      let move = delta;
      if (delta < 0 && offset === height) {
        const before = upward;
        upward -= delta;
        move = -Math.max(0, upward - Math.max(before, REVEAL_DISTANCE));
      } else if (delta > 0) upward = 0;
      // 맨 위에서는 스크롤한 거리보다 더 숨지 않음(위로 갈수록 헤더가 따라 나옴)
      const next = keepShown ? 0 : Math.min(Math.max(offset + move, 0), height, y);
      if (next !== offset) apply(next, false);
      scheduleSettle();
    };

    // 키보드 스크롤은 초점이 본문 밖(body)이어도 일어나므로 문서에서 들음. pointerdown은 스크롤바 끌기
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchend', onTouchEnd, { passive: true });
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: true });
    scroller.addEventListener('wheel', markUser, { passive: true });
    scroller.addEventListener('pointerdown', markUser, { passive: true });
    document.addEventListener('keydown', markUser);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    header.addEventListener('focusin', onFocusIn);
    return () => {
      clearTimeout(settleTimer);
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchend', onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
      scroller.removeEventListener('wheel', markUser);
      scroller.removeEventListener('pointerdown', markUser);
      document.removeEventListener('keydown', markUser);
      scroller.removeEventListener('scroll', onScroll);
      header.removeEventListener('focusin', onFocusIn);
      header.style.transform = '';
      header.style.transition = '';
    };
  }, [enabled, scrollRef, headerRef]);

  return enabled && hidden;
}

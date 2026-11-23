'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { quietFocus } from '@/shared/lib/quietFocus';
import type { useBundleComments } from './useBundleComments';
import { alignDistance, alignedScrollTop, scrollRoom } from '../lib/commentScroll';

type CommentsThread = ReturnType<typeof useBundleComments>;

type CommentsEntryOptions = {
  commentsRef: RefObject<HTMLElement | null>;
  thread: CommentsThread;
  focusInput: () => void;
  /** 말풍선 진입은 'focus', 알림 진입은 'scroll' */
  entry: 'focus' | 'scroll' | null;
  /** 댓글 영역이 그려졌는지(본문이 그려진 뒤에 생김) */
  contentReady: boolean;
  targetCommentId?: string | undefined;
  instantComment: boolean;
};

// 댓글 영역 진입이 화면 전환 끝을 기다리는 최대 시간(전환이 중단돼 표식이 남아도 스크롤·초점은 함)
const ENTRY_TRANSITION_WAIT_MS = 1000;
// 부드러운 스크롤이 끝났다는 신호를 못 받을 때 키보드를 올리는 상한
const SMOOTH_SCROLL_CAP_MS = 900;
// 진입 대기 중 누르면 사용자 조작으로 보는 요소(누르면 초점·동작이 생기는 것)
const INTERACTIVE_SELECTOR =
  'a[href], button, input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])';
// 알림의 댓글 찾기: 이 시간이 지나도 없으면 먼저 댓글 영역을 보여 주고, 상한까지 다음 쪽을 받으며 기다림(답글은 원댓글 뒤에 따로 옴)
const SEEK_SECTION_DELAY_MS = 500;
const SEEK_CAP_MS = 4000;
const SEEK_MAX_PAGES = 5;
// 맞춘 뒤 대상이 가운데에서 이만큼 넘게 벗어나면 다시 맞춤
const SEEK_ALIGN_TOLERANCE_PX = 24;

// 이 기록 항목에 떠날 때의 스크롤이 저장돼 있음(useScrollInHistory): 뒤로 가기로 돌아온 화면
const hasSavedScroll = () =>
  typeof (window.history.state as { pageScroll?: unknown } | null)?.pageScroll === 'number';

/** 댓글 진입(말풍선·알림)의 스크롤·초점 처리. 「댓글로 가기」 동작을 돌려줌 */
export function useCommentsEntry({
  commentsRef,
  thread,
  focusInput,
  entry: commentsEntry,
  contentReady,
  targetCommentId,
  instantComment,
}: CommentsEntryOptions) {
  // 돌아온 화면은 저장된 위치를 지키고 진입 스크롤·초점을 다시 하지 않음. 처음 붙을 때 한 번 정함(진입 스크롤 뒤에는 위치가 저장되므로)
  const returned = useRef<boolean | null>(null);
  useLayoutEffect(() => {
    returned.current ??= hasSavedScroll();
  }, []);
  // scrollIntoView는 전환 중 가로로 밀린 화면을 보이려고 바깥 틀까지 가로 스크롤하므로 세로 스크롤 main만 움직임
  // smooth: 부드럽게(동작 줄이기면 바로), 끝나면 onDone, 돌려준 함수는 기다림을 멈춤. item을 주면 영역 맨 위 대신 그 댓글을 가운데로
  const scrollToComments = useCallback(
    (smooth = false, onDone?: () => void, item?: HTMLElement) => {
      const section = commentsRef.current;
      const main = section?.closest('main');
      if (!section || !main) {
        onDone?.();
        return () => {};
      }
      const top = alignedScrollTop(main, item ?? section, item !== undefined);
      const animate =
        smooth &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
        Math.abs(top - main.scrollTop) > 1;
      if (!animate) {
        main.scrollTop = top;
        onDone?.();
        return () => {};
      }
      // scrollend를 모르는 WebView도 있어 끝을 놓치지 않게 상한 시간도 둠
      const stop = () => {
        main.removeEventListener('scrollend', finish);
        clearTimeout(timer);
      };
      function finish() {
        stop();
        onDone?.();
      }
      const timer = setTimeout(finish, SMOOTH_SCROLL_CAP_MS);
      main.addEventListener('scrollend', finish);
      main.scrollTo({ top, behavior: 'smooth' });
      return stop;
    },
    [commentsRef],
  );
  const goToComments = useCallback(() => {
    scrollToComments();
    focusInput();
  }, [scrollToComments, focusInput]);

  // 알림의 댓글 찾기가 진입 effect를 다시 시작하지 않고 최신 목록 상태를 읽음
  const threadRef = useRef(thread);
  useEffect(() => {
    threadRef.current = thread;
  });

  useEffect(() => {
    if (commentsEntry === null || !contentReady || returned.current) return;
    const startedAt = performance.now();
    let frame = 0;
    let cancelled = false;
    // 기다리는 동안 사용자가 직접 조작하면(키, 누를 수 있는 요소를 누름, 휠·손가락으로 끌어 스크롤) 그 초점·위치를 지키도록 취소
    // 빈 곳 누름(말풍선을 연달아 두 번 눌러 새 화면에 떨어진 두 번째 누름 등)은 끌지 않으므로 취소하지 않음
    let stopScroll = () => {};
    const stopListening = () => {
      document.removeEventListener('keydown', cancel, true);
      document.removeEventListener('pointerdown', cancelOnControl, true);
      document.removeEventListener('touchstart', cancel, true);
      document.removeEventListener('touchmove', cancel, true);
      document.removeEventListener('wheel', cancel, true);
    };
    function cancel() {
      cancelled = true;
      cancelAnimationFrame(frame);
      stopScroll();
      stopListening();
    }
    function cancelOnControl(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) cancel();
    }
    document.addEventListener('keydown', cancel, true);
    document.addEventListener('pointerdown', cancelOnControl, true);
    document.addEventListener('touchmove', cancel, true);
    document.addEventListener('wheel', cancel, true);
    const run = () => {
      // 화면 전환(나가는 화면의 data-page-leaving)이 끝난 뒤 스크롤·초점. 전환이 멈춰 표식이 남아도 잠시 뒤에는 진행
      if (
        !(instantComment && targetCommentId) &&
        document.querySelector('[data-page-leaving]') !== null &&
        performance.now() - startedAt < ENTRY_TRANSITION_WAIT_MS
      ) {
        frame = requestAnimationFrame(run);
        return;
      }
      // 말풍선 진입은 열리기 전에 이미 내려 둠(아래 layout effect): 그사이 늦게 그려진 내용만 바로 맞추고 키보드
      // 알림 진입은 전환 뒤 부드럽게. 키보드는 스크롤이 끝난 뒤(도중에 올리면 iOS가 화면을 함께 밀어 어긋남)
      // 스크롤 중 손가락을 대거나(부드러운 스크롤을 멈춤), 초점이 이미 제목 밖(스크린 리더로 읽는 중 등)이면 초점을 옮기지 않음
      document.addEventListener('touchstart', cancel, true);
      if (commentsEntry === 'scroll' && targetCommentId) {
        seek();
        return;
      }
      stopScroll = scrollToComments(commentsEntry !== 'focus', () => {
        stopListening();
        const focused = document.activeElement;
        const untouched = !focused || focused === document.body || focused.tagName === 'H1';
        if (!cancelled && untouched && commentsEntry === 'focus') focusInput();
      });
    };
    // 알림의 댓글: 그려질 때까지 다음 쪽을 받으며 기다린 뒤 가운데로 스크롤, 초점을 줌
    // 못 찾으면(지워짐·숨김·상한 초과) 댓글 영역 맨 위에 둠
    let seekStartedAt: number | undefined;
    let pages = 0;
    let sectionShown = false;
    function seek() {
      if (cancelled) return;
      seekStartedAt ??= performance.now();
      const item = commentsRef.current?.querySelector<HTMLElement>(`#comment-${targetCommentId}`);
      if (item) {
        // 맞춘 뒤 찾기 상한까지 위치를 지킴: 위쪽 원댓글의 답글이 늦게 그려져 대상이 밀리면 바로 되돌림
        // 조작·다른 주체의 스크롤(스크린 리더·스위치 등은 터치 이벤트가 없음)·초점 이탈이면 멈춤. 긴 댓글은 윗부분을 맞춤
        let lastTop: number | undefined;
        const hold = () => {
          const main = item.closest('main');
          if (
            cancelled ||
            !main ||
            document.activeElement !== item ||
            // 소수 배율 기기의 1px 재정렬은 사용자 스크롤로 보지 않음
            (lastTop !== undefined && Math.abs(main.scrollTop - lastTop) > 1) ||
            performance.now() - (seekStartedAt ?? 0) > SEEK_CAP_MS
          ) {
            stopListening();
            return;
          }
          const off = alignDistance(main, item, true);
          if (
            Math.abs(off) > SEEK_ALIGN_TOLERANCE_PX &&
            scrollRoom(main, off) > SEEK_ALIGN_TOLERANCE_PX
          )
            main.scrollTop += off;
          lastTop = main.scrollTop;
          frame = requestAnimationFrame(hold);
        };
        const settle = () => {
          if (cancelled) return;
          const focused = document.activeElement;
          if (!focused || focused === document.body || focused.tagName === 'H1') quietFocus(item);
          // 초점을 옮기지 않았으면(스크린 리더로 읽는 중 등) 위치도 그 사용자에게 맡김
          hold();
        };
        stopScroll();
        stopScroll = scrollToComments(
          !instantComment,
          // 애니메이션 없는 이동은 바로 끝나서 늦게 그려진 내용이 자리를 잡은 다음 프레임에 판정
          () => (instantComment ? (frame = requestAnimationFrame(settle)) : settle()),
          item,
        );
        return;
      }
      const elapsed = performance.now() - seekStartedAt;
      const list = threadRef.current;
      if (!sectionShown && (elapsed > SEEK_SECTION_DELAY_MS || list.failed || list.moreFailed)) {
        sectionShown = true;
        stopScroll = scrollToComments(!instantComment);
      }
      if (elapsed > SEEK_CAP_MS || list.failed || list.moreFailed) {
        stopListening();
        return;
      }
      if (list.canLoadMore && !list.loading && pages < SEEK_MAX_PAGES) {
        pages += 1;
        void list.loadMore();
      }
      frame = requestAnimationFrame(seek);
    }
    // effect에서 바로 주면 RouteFocus가 이동 전에 남은 초점으로 보고 제목으로 옮기므로 다음 프레임에
    frame = requestAnimationFrame(run);
    return cancel;
  }, [
    commentsEntry,
    contentReady,
    scrollToComments,
    focusInput,
    targetCommentId,
    instantComment,
    commentsRef,
  ]);

  // 말풍선 진입: 피드 카드가 열리는(zoom) 동안 이미 댓글이 보이게, 내용이 처음 그려질 때 화면에 보이기 전에 한 번 내림
  const presetComments = useRef(false);
  useLayoutEffect(() => {
    if (commentsEntry !== 'focus' || !contentReady || presetComments.current) return;
    presetComments.current = true;
    // 목록이 오기 전에도 댓글 영역 맨 위까지 내려갈 수 있게 화면 높이만큼 자리를 둠(열린 뒤 위치가 다시 넘어가지 않게)
    // 돌아온 화면도 자리는 둠(떠날 때 위치가 이 높이 안이라 복원이 잘리지 않게), 내리기는 복원에 맡김
    const section = commentsRef.current;
    const main = section?.closest('main');
    if (section && main) section.style.minHeight = `${main.clientHeight}px`;
    if (!returned.current) scrollToComments();
  }, [commentsEntry, contentReady, scrollToComments, commentsRef]);

  return goToComments;
}

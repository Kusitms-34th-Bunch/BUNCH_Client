'use client';

import type { QueryObserverResult } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { BundleDetail } from '../model/bundle';

// 보류한 이벤트 대신 최신 상세를 받는 재조회가 실패했을 때 다시 받아 보는 간격과 총 시도 횟수(처음 시도 포함)
const HELD_RESYNC_RETRY_MS = 1000;
const HELD_RESYNC_MAX_ATTEMPTS = 3;

type Options = {
  /** 내 사진·참여자 변경 요청이 진행 중이거나 사진을 끄는 중(끝날 때까지 재조회를 미룸) */
  busy: boolean;
  refetchDetail: () => Promise<QueryObserverResult<BundleDetail>>;
  /** 재조회에 성공한 뒤(받은 상세로 후속 안내를 정함). 최신 함수를 ref로 읽어 바뀌어도 재조회를 다시 시작하지 않음 */
  onResynced: (_detail: BundleDetail | undefined) => void;
};

/**
 * 내 요청 중에 보류한 실시간 이벤트 대신 최신 상세를 받음: 요청이 끝나면(`busy`가 풀리면) 재조회
 * - 받는 데 성공한 뒤에만 「놓친 변경이 있음」 표시를 지우고, 실패하면 표시를 남긴 채 몇 번 다시 받아 봄
 * - 그 사이 새 요청이 시작되면 멈췄다가 다시 한가해질 때 처음부터 받음
 * - 모두 실패하면 `failed`(배너·편집 제한), `retry()`로 처음부터 다시 받고 성공해야 풂
 */
export function useHeldEventResync({ busy, refetchDetail, onResynced }: Options) {
  const heldEventRef = useRef(false);
  // 재조회가 정해진 횟수를 다 실패해 화면이 낡았을 수 있는 상태
  const [failed, setFailed] = useState(false);
  // 보내기 직전 확인이 렌더를 기다리지 않고 읽도록 ref로도 둠
  const failedRef = useRef(false);
  // 「재시도」를 누를 때마다 올려 재조회를 처음부터 다시 시작
  const [retryCount, setRetryCount] = useState(0);
  const onResyncedRef = useRef(onResynced);
  useEffect(() => {
    failedRef.current = failed;
    onResyncedRef.current = onResynced;
  });

  useEffect(() => {
    if (busy || !heldEventRef.current) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const resync = (attempt: number) => {
      void refetchDetail().then((result) => {
        if (cancelled) return;
        if (!result.isError) {
          heldEventRef.current = false;
          // 렌더 전에도 보내기 직전 확인이 바로 알도록 ref도 함께 바꿈
          failedRef.current = false;
          setFailed(false);
          onResyncedRef.current(result.data);
          return;
        }
        if (attempt < HELD_RESYNC_MAX_ATTEMPTS) {
          retryTimer = setTimeout(() => resync(attempt + 1), HELD_RESYNC_RETRY_MS);
        } else {
          failedRef.current = true;
          setFailed(true);
        }
      });
    };
    resync(1);
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [busy, retryCount, refetchDetail]);

  return {
    failed,
    /** 지금 재조회 실패 상태인지(렌더를 기다리지 않고 바로 읽음) */
    isFailed: () => failedRef.current,
    /** 이벤트를 보류했음을 기록(요청이 끝나면 재조회) */
    markHeld: () => {
      heldEventRef.current = true;
    },
    hasHeldEvent: () => heldEventRef.current,
    retry: () => setRetryCount((count) => count + 1),
  };
}

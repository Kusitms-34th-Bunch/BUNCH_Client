'use client';

import type { QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@app/design-system';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorCode, apiErrorStatus } from '@/shared/api/client/errorStatus';
import type { BundleDetail } from '../model/bundle';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { pickNewerDetail } from '../lib/draftMapping';

// 일시 오류 뒤 같은 입력으로 다시 시도하기까지의 시간(연속 실패 횟수만큼 길어짐)과 포기하기까지의 횟수
const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 5;
// 버전 충돌은 최신 상세를 받은 직후 바로 이어서 저장
const CONFLICT_RETRY_DELAY_MS = 200;
// 다시 시도하면 될 수 있는 오류: 응답이 없는 네트워크 오류, 서버 오류(5xx)
// 그 밖의 거절(다른 사람이 발행·삭제, 인증·권한, 잘못된 입력 등 4xx)은 같은 요청을 다시 보내도 같은 결과
const isRetryable = (error: unknown) => {
  const status = apiErrorStatus(error);
  return status === undefined || status >= 500;
};

// 아직 서버에 저장하지 못한 입력(필드마다 마지막 값만 보관)
export type Pending = {
  title?: string;
  /** null은 날짜를 지우는 값 */
  date?: string | null;
  comment?: string;
};

export const isEmptyPending = (pending: Pending) =>
  pending.title === undefined && pending.date === undefined && pending.comment === undefined;

type FieldSave<T> = (_input: {
  mode: 'DRAFT';
  value: T;
  expectedVersion: number;
}) => Promise<BundleDetail>;

type Options = {
  /** 저장 루프가 기준으로 삼는 최신 상세(사진 대기열·발행과 함께 씀) */
  readDetail: () => BundleDetail | undefined;
  writeDetail: (_next: BundleDetail) => void;
  /** 내 멤버 id(코멘트 버전을 찾는 기준) */
  myIdRef: RefObject<string | undefined>;
  /** 지금 연결이 끊겼는지(렌더를 기다리지 않고 보내기 직전에 확인) */
  isOffline: () => boolean;
  refetchDetail: () => Promise<QueryObserverResult<BundleDetail>>;
  /** 제목 CRDT 문서 저장(문서 직렬화는 호출하는 쪽이 맡음) */
  saveTitle: () => Promise<BundleDetail>;
  saveDate: FieldSave<string | null>;
  saveComment: FieldSave<string>;
};

/**
 * 제목·날짜·코멘트 자동 저장: 입력은 `change`로 보관하고 `schedule`한 시간 뒤 필드별 버전으로 저장
 * - 충돌은 최신 상세를 받아 같은 입력으로 다시, 일시 오류는 정해진 횟수까지 다시, 권한·상태 오류는 포기(`stalled`)
 * - `discard()`: 연결이 끊기면 아직 보내지 않은 입력과 예약을 버림. 화면을 떠나면 남은 입력을 한 번 저장
 */
export function useDraftAutosave({
  readDetail,
  writeDetail,
  myIdRef,
  isOffline,
  refetchDetail,
  saveTitle,
  saveDate,
  saveComment,
}: Options) {
  const [pending, setPending] = useState<Pending>({});
  const [flushing, setFlushing] = useState(false);
  // 저장을 포기한 상태(권한·상태 오류 또는 재시도 소진): 헤더가 「저장 실패」를 보이고 입력하면 다시 시도
  const [stalled, setStalled] = useState(false);
  // 비동기 저장 루프가 항상 최신 값을 읽도록 ref에 둠(렌더 밖 이벤트·타이머에서만 읽고 씀)
  const pendingRef = useRef<Pending>({});
  // 연결이 끊길 때마다 올림: 그 전에 시작한 저장이 보관해 둔 값은 더 보내지 않음
  const discardGeneration = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef<Promise<boolean> | undefined>(undefined);
  const again = useRef(false);
  const alive = useRef(true);
  // 연속으로 실패한 저장 횟수와 이번 실패에서 이미 안내했는지(입력이 새로 바뀌면 처음부터)
  const failures = useRef(0);
  const notified = useRef(false);
  // 타이머가 항상 최신 flush를 부르도록 ref로 한 번 거침(flush가 자기 자신을 예약하므로)
  const flushRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      // 입력 후 바로 화면을 떠나도 잃지 않도록 남은 입력을 한 번 저장(재시도는 하지 않음)
      if (!isEmptyPending(pendingRef.current)) void flushRef.current();
    };
  }, []);

  const change = useCallback((update: (_current: Pending) => Pending) => {
    pendingRef.current = update(pendingRef.current);
    setPending(pendingRef.current);
  }, []);

  // 저장에 성공한 값이 그 사이 더 바뀌지 않았을 때만 입력 보관을 비움
  const clearField = useCallback(
    (key: keyof Pending, value: unknown) => {
      change((current) => {
        if (current[key] !== value) return current;
        const { [key]: _saved, ...rest } = current;
        return rest;
      });
    },
    [change],
  );

  // 보관 중인 입력을 필드별로 저장하고 끝난 뒤 입력이 모두 비었는지 돌려줌
  // 어느 실패도 입력은 지우지 않고 한 번만 안내
  const runFlush = useCallback(async (): Promise<boolean> => {
    setFlushing(true);
    let retryAfter: number | undefined;
    let stop = false;
    const giveUp = () => {
      stop = true;
      if (alive.current) setStalled(true);
      if (!notified.current) {
        notified.current = true;
        toast(BUNDLE_MESSAGES.saveFailed);
      }
    };
    try {
      do {
        again.current = false;
        const base = readDetail();
        const snapshot = pendingRef.current;
        if (!base || isEmptyPending(snapshot)) break;
        // 이미 끊겼으면(아직 화면이 끊김을 모르는 사이도 포함) 보내지 않음. 보관한 입력은 끊김을 알아챈 뒤 폐기됨
        if (isOffline()) break;
        // 이 저장을 시작한 뒤 연결이 끊겨 입력이 폐기됐으면 보관해 둔 값은 더 보내지 않음
        const generation = discardGeneration.current;
        const discarded = () => generation !== discardGeneration.current || isOffline();
        const common = { mode: 'DRAFT' as const };
        // 필드 하나 저장: 성공하면 입력을 비우고 최신 응답을 기준으로 삼음
        const run = async (save: () => Promise<BundleDetail>, onSaved: () => void) => {
          try {
            const result = await save();
            // 늦게 도착한 낡은 응답이 최신 revision 기준을 덮지 않게 함(기준은 응답을 받은 뒤에 읽음)
            writeDetail(pickNewerDetail(readDetail(), result));
            failures.current = 0;
            onSaved();
          } catch (error) {
            if (apiErrorCode(error) === 'BUNDLE_003') {
              // 최신 상세를 받아 그 버전으로 이어서 저장
              const latest = await refetchDetail();
              if (latest.data) writeDetail(latest.data);
              // 최신 상세를 받지 못했으면 같은 버전으로 곧바로 다시 보내 봐야 또 충돌하므로 일시 오류 간격으로 기다림
              retryAfter = latest.isError ? RETRY_DELAY_MS : CONFLICT_RETRY_DELAY_MS;
            } else if (!isRetryable(error)) {
              giveUp();
              // 삭제·발행·권한 변화는 상세를 다시 받아 화면이 알맞은 상태로 바뀌게 함
              void refetchDetail();
            } else retryAfter = RETRY_DELAY_MS;
          }
        };

        if (snapshot.title !== undefined) {
          const value = snapshot.title;
          await run(saveTitle, () => clearField('title', value));
        }
        if (snapshot.date !== undefined && !stop && !discarded()) {
          const value = snapshot.date;
          await run(
            () =>
              saveDate({
                ...common,
                value,
                expectedVersion: (readDetail() ?? base).dateVersion,
              }),
            () => clearField('date', value),
          );
        }
        if (snapshot.comment !== undefined && !stop && !discarded()) {
          const value = snapshot.comment;
          await run(
            () => {
              const latest = readDetail() ?? base;
              const mine = latest.comments.find((c) => c.memberId === myIdRef.current);
              return saveComment({
                ...common,
                value,
                expectedVersion: mine?.version ?? 0,
              });
            },
            () => clearField('comment', value),
          );
        }
      } while (again.current && retryAfter === undefined && !stop);
    } finally {
      if (alive.current) setFlushing(false);
    }
    const settled = isEmptyPending(pendingRef.current);
    if (settled) {
      failures.current = 0;
      notified.current = false;
    } else if (retryAfter !== undefined && !stop && alive.current) {
      failures.current += 1;
      if (failures.current > MAX_RETRIES) giveUp();
      else {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void flushRef.current(), retryAfter * failures.current);
      }
    }
    // 포기하는 동안 새 입력이 들어왔으면(again) 처음부터 다시 시도
    if (stop && again.current && !settled && alive.current) {
      failures.current = 0;
      notified.current = false;
      setStalled(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flushRef.current(), 0);
    }
    return settled;
  }, [
    clearField,
    isOffline,
    myIdRef,
    readDetail,
    refetchDetail,
    saveComment,
    saveDate,
    saveTitle,
    writeDetail,
  ]);

  // 저장은 한 번에 하나만: 진행 중이면 그 결과를 함께 기다리고 끝난 뒤 한 번 더 확인하도록 표시
  const flush = useCallback((): Promise<boolean> => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const promise = runFlush().finally(() => {
      inflight.current = undefined;
    });
    inflight.current = promise;
    return promise;
  }, [runFlush]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback((delay: number) => {
    // 입력이 새로 바뀌면 이전 실패와 안내를 잊고 처음부터 다시 시도
    failures.current = 0;
    notified.current = false;
    setStalled(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), delay);
  }, []);

  return {
    pending,
    flushing,
    stalled,
    change,
    schedule,
    flush,
    /** 저장하지 못한 입력이 있으면 기다리지 않고 바로 저장 */
    saveNow: () => {
      if (!isEmptyPending(pendingRef.current)) schedule(0);
    },
    /** 예약한 저장을 취소(발행 직전에 직접 저장할 때) */
    cancelScheduled: () => clearTimeout(timer.current),
    discard: () => {
      clearTimeout(timer.current);
      failures.current = 0;
      notified.current = false;
      again.current = false;
      discardGeneration.current += 1;
      pendingRef.current = {};
      setPending({});
      setStalled(false);
    },
  };
}

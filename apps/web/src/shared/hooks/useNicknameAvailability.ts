'use client';

import { toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';

export type NicknameAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'failed';
/** 닉네임 중복 확인 호출. 사용 가능하면 true */
export type CheckNickname = (_nickname: string) => Promise<boolean>;

export const CHECK_FAILURE_MESSAGE = '일시적인 오류가 발생했어요. 다시 시도해 주세요';
const DEBOUNCE_MS = 500;

type Result = { nickname: string; status: 'available' | 'taken' | 'failed' };

/**
 * 입력을 멈추고 0.5초 뒤 중복을 확인하는 상태
 * `check`나 닉네임이 없으면 확인하지 않음(`idle`), 입력이 바뀐 직후부터 결과 도착까지는 `checking`
 * `check`는 최신 함수를 ref로 읽어, 렌더마다 새로 만든 함수여도 재호출하지 않음
 */
export function useNicknameAvailability(
  nickname: string,
  check?: CheckNickname,
): NicknameAvailability {
  const [result, setResult] = useState<Result | null>(null);
  const checkRef = useRef(check);
  const enabled = check !== undefined;

  useEffect(() => {
    checkRef.current = check;
  });

  useEffect(() => {
    if (!enabled || nickname === '') return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkRef.current?.(nickname).then(
        (available) => {
          if (!cancelled) setResult({ nickname, status: available ? 'available' : 'taken' });
        },
        () => {
          if (cancelled) return;
          setResult({ nickname, status: 'failed' });
          toast(CHECK_FAILURE_MESSAGE);
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      // 입력이 바뀌면 이전 결과를 버려, 같은 값으로 되돌아와도 다시 확인
      setResult(null);
    };
  }, [nickname, enabled]);

  if (!enabled || nickname === '') return 'idle';
  return result?.nickname === nickname ? result.status : 'checking';
}

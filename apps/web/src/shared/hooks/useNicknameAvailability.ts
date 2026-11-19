'use client';

import { toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import type { NameCheckResult } from '../api/nameAvailability';

export type NicknameAvailability = 'idle' | 'checking' | NameCheckResult | 'failed';
/** 닉네임 확인 호출: 사용 가능·사용 중·금칙어 포함 */
export type CheckNickname = (_nickname: string) => Promise<NameCheckResult>;

export const CHECK_FAILURE_MESSAGE = '일시적인 오류가 발생했어요. 다시 시도해 주세요';
const DEBOUNCE_MS = 500;

type Result = { nickname: string; status: NameCheckResult | 'failed' };

type Options = {
  /** 실패 토스트 표시(기본 true). false면 토스트 없이 `failed`만 */
  notifyFailure?: boolean;
  /** 대기 없이 바로 확인(입력란에서 포커스가 빠졌을 때 등) */
  immediate?: boolean;
  /** 확인한 값의 결과를 기억해 같은 값으로 돌아오면 다시 묻지 않음(실패는 기억하지 않음) */
  remember?: boolean;
};

/**
 * 입력을 멈추고 0.5초 뒤 중복·금칙어를 확인하는 상태
 * `check`나 닉네임이 없으면 확인하지 않음(`idle`), 입력이 바뀐 직후부터 결과 도착까지는 `checking`
 * `check`는 최신 함수를 ref로 읽어, 렌더마다 새로 만든 함수여도 재호출하지 않음
 * 확인에 실패하면 `failed`와 함께 실패 토스트를 띄움(`notifyFailure: false`면 토스트 없이 `failed`만)
 * 닉네임 말고 이름 중복 확인에도 같은 규칙으로 씀(번치 이름)
 */
export function useNicknameAvailability(
  nickname: string,
  check?: CheckNickname,
  { notifyFailure = true, immediate = false, remember = false }: Options = {},
): NicknameAvailability {
  const [result, setResult] = useState<Result | null>(null);
  // 화면이 열려 있는 동안만 기억. 렌더가 읽는 값이라 바꿀 때마다 새 Map(React Compiler 메모와 맞춤)
  const [remembered, setRemembered] = useState<ReadonlyMap<string, NameCheckResult>>(
    () => new Map(),
  );
  const known = remember ? remembered.get(nickname) : undefined;
  const checkRef = useRef(check);
  const notifyRef = useRef(notifyFailure);
  const enabled = check !== undefined;

  useEffect(() => {
    checkRef.current = check;
    notifyRef.current = notifyFailure;
  });

  useEffect(() => {
    if (!enabled || nickname === '' || known !== undefined) return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        checkRef.current?.(nickname).then(
          (status) => {
            if (remember) setRemembered((previous) => new Map(previous).set(nickname, status));
            if (!cancelled) setResult({ nickname, status });
          },
          () => {
            if (cancelled) return;
            setResult({ nickname, status: 'failed' });
            if (notifyRef.current) toast(CHECK_FAILURE_MESSAGE);
          },
        );
      },
      immediate ? 0 : DEBOUNCE_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
      // 입력이 바뀌면 이전 결과를 버림(`remember`가 아니면 같은 값으로 되돌아와도 다시 확인)
      setResult(null);
    };
  }, [nickname, enabled, immediate, remember, known]);

  if (!enabled || nickname === '') return 'idle';
  if (known) return known;
  return result?.nickname === nickname ? result.status : 'checking';
}

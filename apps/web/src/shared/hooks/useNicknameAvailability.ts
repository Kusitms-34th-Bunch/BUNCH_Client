'use client';

import { toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import { COMMON_MESSAGES } from '@/shared/constants/messages';
import type { NameCheckResult } from '../api/nameAvailability';

export type NicknameAvailability = 'idle' | 'checking' | NameCheckResult | 'failed';
/** 닉네임 확인 호출: 사용 가능·사용 중·금칙어 포함 */
export type CheckNickname = (_nickname: string) => Promise<NameCheckResult>;

export const CHECK_FAILURE_MESSAGE = COMMON_MESSAGES.temporaryFailure;
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
  const immediateRef = useRef(immediate);
  // 대기 중인 확인을 바로 보내는 함수(보냈거나 입력이 바뀌면 null)
  const fireNowRef = useRef<(() => void) | null>(null);
  const enabled = check !== undefined;

  useEffect(() => {
    checkRef.current = check;
    notifyRef.current = notifyFailure;
    immediateRef.current = immediate;
  });

  useEffect(() => {
    if (!enabled || nickname === '' || known !== undefined) return;
    let cancelled = false;
    const fire = () => {
      fireNowRef.current = null;
      checkRef.current?.(nickname).then(
        (status) => {
          // 버려진 요청(입력이 바뀜)의 늦은 응답은 기억하지 않음: 같은 값으로 돌아와 다시 보낸 요청의 결과를 덮지 않게
          if (cancelled) return;
          if (remember) setRemembered((previous) => new Map(previous).set(nickname, status));
          setResult({ nickname, status });
        },
        () => {
          if (cancelled) return;
          setResult({ nickname, status: 'failed' });
          if (notifyRef.current) toast(CHECK_FAILURE_MESSAGE);
        },
      );
    };
    const timer = setTimeout(fire, immediateRef.current ? 0 : DEBOUNCE_MS);
    fireNowRef.current = () => {
      clearTimeout(timer);
      fire();
    };
    return () => {
      cancelled = true;
      clearTimeout(timer);
      fireNowRef.current = null;
      // 입력이 바뀌면 이전 결과를 버림(`remember`가 아니면 같은 값으로 되돌아와도 다시 확인)
      setResult(null);
    };
  }, [nickname, enabled, remember, known]);

  // 대기 중일 때만 남은 대기 없이 보냄. 이미 보낸 확인은 버리지 않아 포커스를 드나들어도 다시 요청·실패 안내를 반복하지 않음
  useEffect(() => {
    if (immediate) fireNowRef.current?.();
  }, [immediate]);

  if (!enabled || nickname === '') return 'idle';
  if (known) return known;
  return result?.nickname === nickname ? result.status : 'checking';
}

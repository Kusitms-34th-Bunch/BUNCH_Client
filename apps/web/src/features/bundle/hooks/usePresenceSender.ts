'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

const REFRESH_MS = 5_000;

export type PresenceTarget = string;

export type PresenceCommands = {
  /** 제목·코멘트에 실제로 입력할 때마다 현재 전체 입력을 보냄(저장이 아님) */
  type: (_target: 'TITLE' | 'COMMENT', _text: string) => void;
  /** 입력란에서 나가면 그 입력의 표시를 바로 끔 */
  blur: (_target: 'TITLE' | 'COMMENT') => void;
  /** 비텍스트 작업(날짜·사진 등)을 시작함. 끝낼 때까지 5초마다 다시 보냄 */
  begin: (_target: PresenceTarget) => void;
  /** 그 target의 작업만 끝냄(다른 진행 작업은 유지) */
  end: (_target: PresenceTarget) => void;
};

type Options = {
  /** presence 명령을 보냄. 연결돼 있지 않으면 보내지 않고 false */
  send: (_body: Record<string, unknown>) => boolean;
  /** 연결이 맺어진 상태 */
  connected: boolean;
  /** 이 초안 화면을 보는 중(초안이 열려 있음) */
  viewing: boolean;
  /** BEGIN·TYPE를 보낼 수 있는 초안 참여 멤버인지(그 밖의 사람은 VIEW만) */
  participant: boolean;
};

const NOOP: PresenceCommands = {
  type: () => undefined,
  blur: () => undefined,
  begin: () => undefined,
  end: () => undefined,
};

/**
 * presence 명령 전송(API 명세 v5): 입장하면 VIEW를 바로 보내고 5초마다 다시 보내며, 비텍스트 작업은 target별 BEGIN을 5초마다 갱신함
 * 실제 앱 이탈(탭·앱이 보이지 않게 됨)은 BACKGROUND를 보냄. 끊긴 사이의 입력은 보관·재전송하지 않음
 */
export function usePresenceSender({
  send,
  connected,
  viewing,
  participant,
}: Options): PresenceCommands {
  const sendRef = useRef(send);
  const participantRef = useRef(participant);
  useEffect(() => {
    sendRef.current = send;
    participantRef.current = participant;
  });
  // 진행 중인 비텍스트 작업 target(끝낼 때까지 입장 신호와 함께 5초마다 다시 보냄)
  const running = useRef(new Set<string>());

  const begin = useCallback((target: string) => {
    if (!participantRef.current || running.current.has(target)) return;
    running.current.add(target);
    sendRef.current({ action: 'BEGIN', target });
  }, []);

  const end = useCallback((target: string) => {
    if (!running.current.delete(target)) return;
    sendRef.current({ action: 'END', target });
  }, []);

  const type = useCallback((target: 'TITLE' | 'COMMENT', text: string) => {
    if (!participantRef.current) return;
    sendRef.current({ action: 'TYPE', target, text });
  }, []);

  const blur = useCallback((target: 'TITLE' | 'COMMENT') => {
    if (!participantRef.current) return;
    sendRef.current({ action: 'BLUR', target });
  }, []);

  // 입장: 연결되면 VIEW를 바로 보내고, 5초마다 VIEW와 진행 중인 작업의 BEGIN을 다시 보냄. 재연결은 새 연결이라 진행 중이던 작업도 새로 알림
  // 화면을 나가거나 연결이 끊기면 멈춤(나갈 때의 LEAVE는 연결을 닫기 전에 연결 쪽이 보냄)
  useEffect(() => {
    if (!connected || !viewing) return;
    const refresh = () => {
      sendRef.current({ action: 'VIEW' });
      for (const target of running.current) sendRef.current({ action: 'BEGIN', target });
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [connected, viewing]);

  // 실제 앱 이탈: 탭·앱이 보이지 않게 되면 BACKGROUND, 다시 보이면 VIEW(사진함·갤러리 진입에 따른 단순 포커스 이동과 구분)
  useEffect(() => {
    if (!connected || !viewing) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendRef.current({ action: 'BACKGROUND' });
      } else {
        sendRef.current({ action: 'VIEW' });
        for (const target of running.current) sendRef.current({ action: 'BEGIN', target });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [connected, viewing]);

  // 연결·입장 상태가 바뀔 때만 바뀌는 값(사용하는 쪽이 의존성으로 쓸 수 있음)
  return useMemo(
    () => (connected && viewing ? { type, blur, begin, end } : NOOP),
    [connected, viewing, type, blur, begin, end],
  );
}

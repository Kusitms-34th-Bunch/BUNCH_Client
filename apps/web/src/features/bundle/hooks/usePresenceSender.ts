'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

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
  // 명령은 연결 여부와 상관없이 같은 함수: 끊긴 동안 받은 명령으로 끝내도 진행 작업 목록에서 빠지게 함(전송만 연결됐을 때)
  const liveRef = useRef(connected && viewing);
  const connectedRef = useRef(connected);
  // layout effect는 같은 커밋의 자식 passive effect(PresenceScope의 begin)보다 먼저 돌아 최신 참여 여부를 읽게 함
  useLayoutEffect(() => {
    sendRef.current = send;
    participantRef.current = participant;
    liveRef.current = connected && viewing;
    connectedRef.current = connected;
  });
  // 진행 중인 비텍스트 작업 target과 그 작업을 하는 곳의 수(끝낼 때까지 입장 신호와 함께 5초마다 다시 보냄)
  // 같은 target(예: 사진)을 여러 곳(시트·화면·확인 창)이 쓰므로 모두 끝났을 때만 END를 보냄(열린 화면과 진행 작업의 합집합)
  const running = useRef(new Map<string, number>());

  const begin = useCallback((target: string) => {
    if (!participantRef.current) return;
    const count = running.current.get(target) ?? 0;
    running.current.set(target, count + 1);
    // 탭이 숨겨진 동안·끊긴 동안은 보내지 않음(BACKGROUND로 지운 표시를 되살리지 않고, 다시 보이거나 연결되면 진행 작업을 함께 알림)
    if (count === 0 && liveRef.current && document.visibilityState !== 'hidden') {
      sendRef.current({ action: 'BEGIN', target });
    }
  }, []);

  const end = useCallback((target: string) => {
    const count = running.current.get(target);
    if (count === undefined) return;
    if (count > 1) {
      running.current.set(target, count - 1);
      return;
    }
    running.current.delete(target);
    if (connectedRef.current) sendRef.current({ action: 'END', target });
  }, []);

  const type = useCallback((target: 'TITLE' | 'COMMENT', text: string) => {
    if (!participantRef.current || !liveRef.current) return;
    sendRef.current({ action: 'TYPE', target, text });
  }, []);

  const blur = useCallback((target: 'TITLE' | 'COMMENT') => {
    if (!participantRef.current || !liveRef.current) return;
    sendRef.current({ action: 'BLUR', target });
  }, []);

  // 입장: 연결되면 VIEW를 바로 보내고, 5초마다 VIEW와 진행 중인 작업의 BEGIN을 다시 보냄. 재연결은 새 연결이라 진행 중이던 작업도 새로 알림
  // 실제 앱 이탈: 탭·앱이 보이지 않게 되면 BACKGROUND, 다시 보이면 입장을 다시 알림(사진함·갤러리 진입에 따른 단순 포커스 이동과 구분)
  // 화면을 나가거나 연결이 끊기면 멈춤(나갈 때의 LEAVE는 연결을 닫기 전에 연결 쪽이 보냄)
  useEffect(() => {
    if (!connected || !viewing) return;
    const announce = () => {
      sendRef.current({ action: 'VIEW' });
      // 작업 중에 참여 멤버에서 빠졌으면 남은 작업을 다시 알리지 않음
      if (!participantRef.current) return;
      for (const target of running.current.keys()) {
        sendRef.current({ action: 'BEGIN', target });
      }
    };
    const refresh = () => {
      // 앱 이탈(BACKGROUND)로 지운 입장을 숨겨진 동안 되살리지 않음
      if (document.visibilityState === 'hidden') return;
      announce();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') sendRef.current({ action: 'BACKGROUND' });
      else announce();
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [connected, viewing]);

  // 초안이 아니게 되면(발행·삭제) 진행 작업을 끝냄. 명령이 연결 상태로 바뀌던 때 PresenceScope 정리가 하던 동작과 같음
  const wasViewing = useRef(viewing);
  useEffect(() => {
    const left = wasViewing.current && !viewing;
    wasViewing.current = viewing;
    if (!left) return;
    for (const target of running.current.keys()) {
      if (connectedRef.current) sendRef.current({ action: 'END', target });
    }
    running.current.clear();
  }, [viewing]);

  // 늘 같은 값(사용하는 쪽 effect가 연결 변화마다 다시 돌지 않음, 재연결 때 진행 작업은 위 입장 effect가 알림)
  return useMemo(() => ({ type, blur, begin, end }), [type, blur, begin, end]);
}

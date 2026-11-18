'use client';

import { createContext, useContext } from 'react';
import type { CreatedBunch } from '../api/bunches';
import type { InvitationCard } from '../api/invitations';

/** 링크 입력에서 확인을 마친 초대(초대 확인 화면이 카드를 보여 주고 참여할 때 같은 입력을 다시 보냄) */
export type VerifiedJoin = { invitation: string; card: InvitationCard };

export type JoinInvitationFlow = {
  verified: VerifiedJoin | null;
  /** 초대 확인을 마친 뒤 저장. 이전에 확인한 초대와 다르면 참여 결과를 버림(멱등 키는 초대 입력이 바뀌면 새로 만듦) */
  setVerified: (_verified: VerifiedJoin) => void;
  /** 참여를 마친 번치(참여 완료 화면이 읽음). 아직 없으면 null */
  joinedBunch: CreatedBunch | null;
  setJoinedBunch: (_bunch: CreatedBunch) => void;
  /** 같은 초대의 재시도가 같은 멱등 키를 쓰게 함(응답이 유실돼도 참여가 한 번만 처리됨) */
  idempotencyKeyFor: (_invitation: string) => string;
  /** 서버가 요청을 거절하면(4xx) 같은 키의 재생을 피하려고 키를 버림 */
  discardIdempotencyKey: () => void;
};

export const JoinInvitationContext = createContext<JoinInvitationFlow | null>(null);

export function useJoinInvitationFlow() {
  const flow = useContext(JoinInvitationContext);
  if (!flow) throw new Error('useJoinInvitationFlow는 JoinInvitationProvider 안에서 써야 합니다.');
  return flow;
}

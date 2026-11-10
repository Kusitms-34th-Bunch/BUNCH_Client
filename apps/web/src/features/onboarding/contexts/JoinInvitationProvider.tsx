'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import type { CreatedBunch } from '../api/bunches';
import { JoinInvitationContext, type VerifiedJoin } from './joinInvitationContext';

// join layout에서 링크 입력 → 초대 확인 → 참여 완료 사이 상태 유지. 새로고침이나 흐름 이탈 시 초기화
export function JoinInvitationProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /** 테스트에서 앞 단계를 마친 상태로 시작하기 위한 초기값 */
  initial?: Partial<{ verified: VerifiedJoin; joinedBunch: CreatedBunch }>;
}) {
  const [verified, setVerifiedState] = useState<VerifiedJoin | null>(initial?.verified ?? null);
  const [joinedBunch, setJoinedBunch] = useState<CreatedBunch | null>(initial?.joinedBunch ?? null);
  const attempt = useRef<{ invitation: string; key: string } | undefined>(undefined);
  // 마지막으로 확인한 초대 입력(다른 초대로 바뀌었는지 state updater 밖에서 비교)
  const verifiedInvitation = useRef(initial?.verified?.invitation);

  const setVerified = useCallback((next: VerifiedJoin) => {
    // 다른 초대를 확인했으면 이전 초대의 참여 결과는 버림
    if (verifiedInvitation.current !== next.invitation) setJoinedBunch(null);
    verifiedInvitation.current = next.invitation;
    setVerifiedState(next);
  }, []);

  const idempotencyKeyFor = useCallback((invitation: string) => {
    if (attempt.current?.invitation !== invitation) {
      attempt.current = { invitation, key: createIdempotencyKey() };
    }
    return attempt.current.key;
  }, []);

  const discardIdempotencyKey = useCallback(() => {
    attempt.current = undefined;
  }, []);

  return (
    <JoinInvitationContext
      value={{
        verified,
        setVerified,
        joinedBunch,
        setJoinedBunch,
        idempotencyKeyFor,
        discardIdempotencyKey,
      }}
    >
      {children}
    </JoinInvitationContext>
  );
}

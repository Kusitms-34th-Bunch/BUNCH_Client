import { useMemo, useSyncExternalStore } from 'react';
import type { BunchMember, BunchRole } from '../lib/types';
import { bunchMembersFixture } from '../fixtures/bunchMembers.fixture';

type Members = Readonly<Record<string, readonly BunchMember[]>>;

// 샘플(fixture) 화면의 역할 변경·내보내기 결과 저장소(메모리, 새로고침하면 fixture로 돌아감)
// 멤버 관리 화면은 서버(`queries/memberships.ts`, #330). 더보기·나가기 화면 연결 때 정리
const EMPTY: Members = {};
let changed: Members = EMPTY;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const update = (bunchId: string, change: (_members: readonly BunchMember[]) => BunchMember[]) => {
  changed = {
    ...changed,
    [bunchId]: change(changed[bunchId] ?? bunchMembersFixture[bunchId] ?? []),
  };
  listeners.forEach((listener) => listener());
};

const ROLE_ORDER: Record<BunchRole, number> = { owner: 0, coOwner: 1, member: 2 };

/** 화면설계서 1번: 메인 관리자 → 공동 관리자 → 일반 멤버, 같은 역할은 이름 오름차순 */
export const sortMembers = (members: readonly BunchMember[]) =>
  [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name, 'ko'),
  );

/** 관리 동작. 서버에 보내면 끝날 때까지 기다릴 수 있게 Promise(실패하면 reject, 실패 안내는 동작 쪽 담당) */
export type BunchMemberActions = {
  setRole: (_memberId: string, _role: 'coOwner' | 'member') => void | Promise<unknown>;
  /** 메인 관리자를 넘기고 나는 일반 멤버가 됨(화면설계서 4번) */
  transferOwner: (_memberId: string) => void | Promise<unknown>;
  remove: (_memberId: string) => void | Promise<unknown>;
};

/**
 * 번치 멤버(정렬됨)와 내 역할, 관리 동작. 번치를 아직 모르면 members·myRole이 undefined
 * 서버 렌더는 fixture 그대로라 hydration 결과가 같음
 */
export function useBunchMembers(bunchId: string | undefined) {
  const all = useSyncExternalStore(
    subscribe,
    () => changed,
    () => EMPTY,
  );
  const list = bunchId === undefined ? undefined : (all[bunchId] ?? bunchMembersFixture[bunchId]);
  // 저장소가 바뀔 때만 다시 정렬(받는 쪽 memo가 매 렌더 다시 계산되지 않게)
  const members = useMemo(() => list && sortMembers(list), [list]);
  const actions: BunchMemberActions = {
    setRole: (memberId, role) => {
      if (bunchId === undefined) return;
      update(bunchId, (current) =>
        current.map((member) => (member.id === memberId ? { ...member, role } : member)),
      );
    },
    transferOwner: (memberId) => {
      if (bunchId === undefined) return;
      update(bunchId, (current) =>
        current.map((member) =>
          member.id === memberId
            ? { ...member, role: 'owner' }
            : member.role === 'owner'
              ? { ...member, role: 'member' }
              : member,
        ),
      );
    },
    remove: (memberId) => {
      if (bunchId === undefined) return;
      update(bunchId, (current) => current.filter((member) => member.id !== memberId));
    },
  };
  return { members, myRole: members?.find((member) => member.isMe)?.role, actions };
}

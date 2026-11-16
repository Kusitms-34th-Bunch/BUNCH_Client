import type { BunchMember, BunchRole } from './types';

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

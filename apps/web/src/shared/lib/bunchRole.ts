import type { BunchMemberRole } from '@/shared/api/bunchMembers';

/** 번치에서의 역할(화면 표기, 기능명세 5장 권한 표). 메뉴 항목·권한·역할 배지를 정하는 기준 */
export type BunchRole = 'owner' | 'coOwner' | 'member';

/** 서버 역할 → 화면 역할 */
export const BUNCH_ROLE_FROM_SERVER: Readonly<Record<BunchMemberRole, BunchRole>> = {
  OWNER: 'owner',
  CO_OWNER: 'coOwner',
  MEMBER: 'member',
};

/** 메인·공동 관리자(관리 기능을 쓸 수 있는 역할) */
export const isAdminRole = (role: BunchRole | undefined) => role === 'owner' || role === 'coOwner';

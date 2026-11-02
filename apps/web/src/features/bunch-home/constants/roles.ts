import type { BunchRole } from '../lib/types';

/** 역할 이름(역할 배지 낭독, 멤버 관리·다른 번치 멤버 목록) */
export const ROLE_LABELS: Record<BunchRole, string> = {
  owner: '메인 관리자',
  coOwner: '공동 관리자',
  member: '일반 멤버',
};

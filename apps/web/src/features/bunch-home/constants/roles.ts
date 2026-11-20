import type { BunchRole } from '../lib/types';

/** 역할 이름(역할 배지 낭독, 멤버 관리·다른 번치 멤버 목록) */
export const ROLE_LABELS: Record<BunchRole, string> = {
  owner: '메인 관리자',
  coOwner: '공동 관리자',
  member: '일반 멤버',
};

/** 그 사이 역할이 바뀌어 권한이 없는 요청(서버 `FORBIDDEN`, 403). 프로필 편집·번치 삭제의 권한 변경 안내(기능명세 5.4.1 예외) */
export const PERMISSION_DENIED_CODE = 'AUTH_002';

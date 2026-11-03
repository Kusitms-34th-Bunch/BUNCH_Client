import type { BunchRole } from './types';

/** 메인·공동 관리자(권한 표: 차단·차단 해제 등) */
export const isAdminRole = (role: BunchRole | undefined) => role === 'owner' || role === 'coOwner';

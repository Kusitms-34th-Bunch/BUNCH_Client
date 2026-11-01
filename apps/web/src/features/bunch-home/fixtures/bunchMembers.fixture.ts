import type { BunchMember } from '../lib/types';

// 멤버 API 연결 전 번치별 멤버(번치 홈 fixture의 내 역할·멤버 수와 맞춤, 퇴근런클럽은 Figma 2500:65206 예시)
export const bunchMembersFixture: Readonly<Record<string, readonly BunchMember[]>> = {
  'bunch-run': [
    { id: 'me', name: '은우링링링', role: 'owner', isMe: true },
    { id: 'member-kyungjin', name: '경진', role: 'coOwner' },
    { id: 'member-kyungjun', name: '경준', role: 'member' },
    { id: 'member-suin', name: '수인', role: 'member' },
    { id: 'member-jiye', name: '지예', role: 'member' },
  ],
  'bunch-trip': [
    { id: 'member-haneul', name: '하늘', role: 'owner' },
    { id: 'me', name: '은우링링링', role: 'coOwner', isMe: true },
    { id: 'member-kyungjun', name: '경준', role: 'member' },
    { id: 'member-suin', name: '수인', role: 'member' },
  ],
  'bunch-gift': [
    { id: 'member-minji', name: '민지', role: 'owner' },
    { id: 'member-doyun', name: '도윤', role: 'coOwner' },
    { id: 'me', name: '은우링링링', role: 'member', isMe: true },
    { id: 'member-seoyeon', name: '서연', role: 'member' },
    { id: 'member-jiho', name: '지호', role: 'member' },
    { id: 'member-harin', name: '하린', role: 'member' },
  ],
};

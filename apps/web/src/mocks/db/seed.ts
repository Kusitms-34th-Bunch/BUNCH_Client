import type { MockDbState, MockMember, MockMembership } from './types';

/** 시연하는 사람(번치 메인 관리자), 로그인 없이 이 회원으로 접속한 것으로 간주 */
export const MOCK_MY_MEMBER_ID = 1;
export const MOCK_BUNCH_ID = 1;

const member = (memberId: number, nickname: string): MockMember => ({
  memberId,
  nickname,
  imageUrl: null,
  birthYear: null,
  gender: null,
});

const membership = (memberId: number, role: MockMembership['role']): MockMembership => ({
  bunchId: MOCK_BUNCH_ID,
  memberId,
  role,
});

// 시작 데이터, 화면 fixture의 번치 「여행가조」와 같은 구성
export const createSeed = (): MockDbState => ({
  members: [
    member(MOCK_MY_MEMBER_ID, '지예'),
    member(2, '경진'),
    member(3, '은우'),
    member(4, '수인'),
    member(5, '효찬'),
    member(6, '경준'),
    member(7, '재현'),
    member(8, '서현'),
  ],
  bunches: [{ id: MOCK_BUNCH_ID, name: '여행가조', characterType: 'TYPE_1', imageUrl: null }],
  memberships: [
    membership(MOCK_MY_MEMBER_ID, 'OWNER'),
    membership(2, 'CO_OWNER'),
    membership(3, 'MEMBER'),
    membership(4, 'MEMBER'),
    membership(5, 'MEMBER'),
    membership(6, 'MEMBER'),
    membership(7, 'MEMBER'),
    membership(8, 'MEMBER'),
  ],
});

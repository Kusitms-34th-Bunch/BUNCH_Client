import type { BunchRole, Draft, DraftMember, DraftViewer } from './types';

export type DraftAccess = {
  /** 이 초안의 참여 멤버인지. 아니면 보기 전용 */
  participant: boolean;
  /** 제목·사진·캡션·위치·날짜·공개 범위를 고칠 수 있는지 */
  canEdit: boolean;
  /** 참여 멤버에 더할 수 있는지 */
  canAddMember: boolean;
  /** 초안 생성자이거나 참여 중인 관리자(공동 관리자 포함)라 발행할 수 있는지 */
  canPublish: boolean;
};

const isAdminRole = (role: BunchRole) => role === 'owner' || role === 'coOwner';

/** docs/specs/bundle-create.md 「대상 사용자와 접근 권한」 표 */
export const getDraftAccess = (draft: Draft, viewer: DraftViewer): DraftAccess => {
  const me = draft.members.find((member) => member.id === viewer.memberId);
  const participant = me !== undefined;
  return {
    participant,
    canEdit: participant,
    canAddMember: participant,
    canPublish: participant && (me.isCreator || isAdminRole(viewer.bunchRole)),
  };
};

/**
 * 다른 멤버 카드의 삭제 버튼(X)을 보일지: 초안 생성자와 참여 중인 관리자만, 초안 생성자 카드와 내 카드에는 없음
 * 참여 멤버가 아니면 아무에게도 보이지 않음
 */
export const canRemoveMember = (
  draft: Draft,
  viewer: DraftViewer,
  target: DraftMember,
): boolean => {
  const me = draft.members.find((member) => member.id === viewer.memberId);
  if (!me || target.id === me.id || target.isCreator) return false;
  return me.isCreator || isAdminRole(viewer.bunchRole);
};

export type MemberBadge = 'owner' | 'coOwner' | 'draftAuthor';

/** 역할 배지는 하나만: 관리자 > 공동 관리자 > 초안 생성자 > 없음 */
export const getMemberBadge = (member: DraftMember): MemberBadge | undefined => {
  if (member.bunchRole === 'owner') return 'owner';
  if (member.bunchRole === 'coOwner') return 'coOwner';
  if (member.isCreator) return 'draftAuthor';
  return undefined;
};

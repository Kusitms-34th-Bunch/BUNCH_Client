import type { DraftAccess } from '../../lib/permissions';

/** 수정 화면에서 메인 관리자가 하는 일: 제목·사진·위치·날짜는 고치고, 참여 멤버 관리와 발행은 하지 않음 */
export const EDIT_ACCESS: DraftAccess = {
  participant: true,
  canEdit: true,
  canAddMember: false,
  canPublish: false,
  canAddPhoto: true,
};

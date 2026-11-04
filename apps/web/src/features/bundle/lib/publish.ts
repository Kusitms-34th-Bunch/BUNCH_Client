import type { Draft, DraftEditing, SaveStatus } from './types';

export type PublishBlocker =
  'title' | 'photos' | 'visibility' | 'members' | 'comments' | 'saving' | 'unsaved' | 'offline';

type PublishContext = {
  saveStatus: SaveStatus;
  /** 연결 끊김 배너가 떠 있는지 */
  offline: boolean;
};

const MIN_MEMBERS = 2;

/**
 * 발행 조건 중 아직 채우지 못한 것(위치·날짜·캡션은 조건이 아니고 공개 범위는 하나를 골라야 함)
 * 비어 있으면 필수 항목을 모두 채운 것
 */
export const getPublishBlockers = (draft: Draft, context: PublishContext): PublishBlocker[] => {
  const blockers: PublishBlocker[] = [];
  if (draft.title.trim() === '') blockers.push('title');
  if (draft.photos.length < 1) blockers.push('photos');
  if (draft.visibility === null) blockers.push('visibility');
  if (draft.members.length < MIN_MEMBERS) blockers.push('members');
  const everyoneCommented = draft.members.every((member) =>
    draft.comments.some((comment) => comment.memberId === member.id && comment.text.trim() !== ''),
  );
  if (!everyoneCommented) blockers.push('comments');
  if (context.saveStatus === 'saving') blockers.push('saving');
  if (context.saveStatus === 'failed') blockers.push('unsaved');
  if (context.offline) blockers.push('offline');
  return blockers;
};

/**
 * 나 말고 편집 중인 멤버가 있는지(제목·사진·위치·날짜, 코멘트 작성 중 포함). 업로드는 막지 않고 확인 창만 바꿈
 * 기획: 지금 업로드하면 작성 중인 내용 일부가 반영되지 않을 수 있음(서버 동작은 발행 API 연동 때 확인)
 */
export const hasOtherEditors = (editing: DraftEditing, myId: string): boolean =>
  [
    editing.title,
    editing.location,
    editing.date,
    ...(editing.photoMemberIds ?? []),
    ...Object.values(editing.photoEditors ?? {}).flat(),
    ...(editing.commentMemberIds ?? []),
  ].some((memberId) => memberId !== undefined && memberId !== myId);

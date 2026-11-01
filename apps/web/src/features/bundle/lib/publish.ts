import type { Draft, SaveStatus } from './types';

export type PublishBlocker = 'title' | 'photos' | 'members' | 'comments' | 'saving' | 'offline';

type PublishContext = {
  saveStatus: SaveStatus;
  /** 연결 끊김 배너가 떠 있는지 */
  offline: boolean;
};

const MIN_MEMBERS = 2;

/**
 * 발행 조건 중 아직 채우지 못한 것(위치·날짜·캡션은 조건이 아님, 공개 범위는 항상 골라져 있음)
 * 비어 있으면 필수 항목을 모두 채운 것
 */
export const getPublishBlockers = (draft: Draft, context: PublishContext): PublishBlocker[] => {
  const blockers: PublishBlocker[] = [];
  if (draft.title.trim() === '') blockers.push('title');
  if (draft.photos.length < 1) blockers.push('photos');
  if (draft.members.length < MIN_MEMBERS) blockers.push('members');
  const everyoneCommented = draft.members.every((member) =>
    draft.comments.some((comment) => comment.memberId === member.id && comment.text.trim() !== ''),
  );
  if (!everyoneCommented) blockers.push('comments');
  if (context.saveStatus === 'saving') blockers.push('saving');
  if (context.offline) blockers.push('offline');
  return blockers;
};

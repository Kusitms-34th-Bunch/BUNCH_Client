import { isApiError } from '@app/api-core';
import { apiErrorCode } from '@/shared/api/errorStatus';
import { prohibitedFieldsOf } from '@/shared/api/prohibitedWord';
import type { Draft, DraftEditing, SaveStatus } from './types';
import { readPublishBlockers } from '../api/bundleErrors';
import { BUNDLE_MESSAGES, TITLE_MAX_LENGTH } from '../constants/messages';
import { countTitleGraphemes } from './title';

export type PublishBlocker =
  | 'title'
  | 'titleTooLong'
  | 'titleProhibited'
  | 'photos'
  | 'visibility'
  | 'members'
  | 'comments'
  | 'commentsProhibited'
  | 'saving'
  | 'unsaved'
  | 'offline';

type PublishContext = {
  saveStatus: SaveStatus;
  /** 연결 끊김 배너가 떠 있는지 */
  offline: boolean;
};

const MIN_MEMBERS = 2;

/**
 * 발행 조건 중 아직 채우지 못한 것(위치·날짜는 조건이 아니고 공개 범위는 하나를 골라야 함)
 * 비어 있으면 필수 항목을 모두 채운 것
 */
export const getPublishBlockers = (draft: Draft, context: PublishContext): PublishBlocker[] => {
  const blockers: PublishBlocker[] = [];
  if (draft.title.trim() === '') blockers.push('title');
  // 동시 편집이 합쳐져 40자를 넘을 수 있음(자르지 않고 그대로 두며 줄일 때까지 발행을 막음)
  else if (countTitleGraphemes(draft.title) > TITLE_MAX_LENGTH) blockers.push('titleTooLong');
  // 서버가 저장 때 검사한 금칙어(제목·코멘트)가 있는 동안 업로드할 수 없음(기능명세 4.3.12 로직 2)
  if (draft.prohibited?.title) blockers.push('titleProhibited');
  if (draft.photos.length < 1) blockers.push('photos');
  if (draft.visibility === null) blockers.push('visibility');
  if (draft.members.length < MIN_MEMBERS) blockers.push('members');
  const everyoneCommented = draft.members.every((member) =>
    draft.comments.some((comment) => comment.memberId === member.id && comment.text.trim() !== ''),
  );
  if (!everyoneCommented) blockers.push('comments');
  if (draft.members.some((member) => draft.prohibited?.commentMemberIds.includes(member.id)))
    blockers.push('commentsProhibited');
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
  [...getEditingMemberIds(editing)].some((memberId) => memberId !== myId);

/** 지금 무엇이든 작업 중인 멤버 id(제목·코멘트 입력, 사진·위치·날짜 작업) */
export const getEditingMemberIds = (editing: DraftEditing): ReadonlySet<string> =>
  new Set([
    ...(editing.titleMemberIds ?? []),
    ...(editing.commentMemberIds ?? []),
    ...(editing.photoMemberIds ?? []),
    ...(editing.locationAddMemberIds ?? []),
    ...Object.values(editing.locationEditors ?? {}).flat(),
    ...(editing.dateMemberIds ?? []),
  ]);

/** 발행 실패를 화면 결과·안내 문구·요청 키 유지 여부로 분류 */
export const classifyPublishError = (
  error: unknown,
): { outcome: 'blocked' | 'failed'; message: string; keepKey: boolean } => {
  // 서버가 요청 자체를 거절했으면(4xx) 같은 요청이 다시 거절될 수 있어 키를 비우고, 응답이 없거나 5xx면 키를 유지함
  // 서버 응답(ApiError)이 아닌 오류는 서버가 받았는지 알 수 없으므로 키를 유지함
  const keepKey = !(
    isApiError(error) &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500
  );
  // 발행 잠금에서 다시 검사한 제목·코멘트에 금칙어가 있어 거부(COMMON_003): 최신 상태는 다시 받아 입력란 아래 안내로 보임
  if (prohibitedFieldsOf(error) !== null) {
    return { outcome: 'blocked', message: BUNDLE_MESSAGES.publishProhibited, keepKey };
  }
  if (readPublishBlockers(error) !== undefined) {
    return { outcome: 'blocked', message: BUNDLE_MESSAGES.uploadIncomplete, keepKey };
  }
  const code = apiErrorCode(error);
  // 충돌(BUNDLE_003)과 이미 발행됨·본문 불일치(BUNDLE_002)는 최신 내용을 확인하고 다시 해야 하는 같은 상황
  const conflict = code === 'BUNDLE_003' || code === 'BUNDLE_002';
  return {
    outcome: 'failed',
    message: conflict ? BUNDLE_MESSAGES.publishConflict : BUNDLE_MESSAGES.publishFailed,
    keepKey,
  };
};

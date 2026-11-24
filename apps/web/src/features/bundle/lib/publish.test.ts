import { ApiError } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import type { Draft, DraftMember } from './types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { classifyPublishError, getPublishBlockers, hasOtherEditors } from './publish';

const member = (id: string): DraftMember => ({
  id,
  name: id,
  bunchRole: 'member',
  isCreator: false,
});

const complete: Draft = {
  id: 'd',
  members: [member('a'), member('b')],
  title: '제목',
  photos: [{ id: 'p1', src: '/p1.jpg', alt: '', takenAt: null, uploaderId: 'a' }],
  locations: [],
  date: null,
  suggestedDates: [],
  picks: {},
  comments: [
    { memberId: 'a', text: '하나' },
    { memberId: 'b', text: '둘' },
  ],
  visibility: 'public',
  editing: {},
  viewingMemberIds: [],
};

const ready = { saveStatus: 'saved', offline: false } as const;

describe('getPublishBlockers', () => {
  it('필수 항목을 모두 채우면 막는 것이 없다(위치·날짜·캡션은 조건이 아니다)', () => {
    expect(getPublishBlockers(complete, ready)).toEqual([]);
  });

  it('서버가 검사한 제목·코멘트 금칙어가 있으면 업로드를 막는다', () => {
    expect(
      getPublishBlockers({ ...complete, prohibited: { title: true, commentMemberIds: [] } }, ready),
    ).toEqual(['titleProhibited']);
    expect(
      getPublishBlockers(
        { ...complete, prohibited: { title: false, commentMemberIds: ['b'] } },
        ready,
      ),
    ).toEqual(['commentsProhibited']);
  });

  it('참여 멤버가 아닌 사람의 코멘트 금칙어는 막지 않는다', () => {
    expect(
      getPublishBlockers(
        { ...complete, prohibited: { title: false, commentMemberIds: ['z'] } },
        ready,
      ),
    ).toEqual([]);
  });

  it('제목은 앞뒤 공백을 빼고 1자 이상이어야 한다', () => {
    expect(getPublishBlockers({ ...complete, title: '   ' }, ready)).toEqual(['title']);
  });

  it('동시 편집이 합쳐져 제목이 40자를 넘으면 줄일 때까지 막는다', () => {
    expect(getPublishBlockers({ ...complete, title: '가'.repeat(41) }, ready)).toEqual([
      'titleTooLong',
    ]);
    expect(getPublishBlockers({ ...complete, title: '가'.repeat(40) }, ready)).toEqual([]);
  });

  it('공개 범위를 골라야 한다', () => {
    expect(getPublishBlockers({ ...complete, visibility: null }, ready)).toEqual(['visibility']);
  });

  it('사진이 1장 이상 있어야 한다', () => {
    expect(getPublishBlockers({ ...complete, photos: [] }, ready)).toEqual(['photos']);
  });

  it('참여 멤버가 2명 이상이어야 한다', () => {
    const solo = { ...complete, members: [member('a')] };
    expect(getPublishBlockers(solo, ready)).toEqual(['members']);
  });

  it('참여 멤버 모두 코멘트를 써야 하고 공백뿐인 코멘트는 쓰지 않은 것으로 본다', () => {
    const missing = { ...complete, comments: [{ memberId: 'a', text: '하나' }] };
    expect(getPublishBlockers(missing, ready)).toEqual(['comments']);
    const blank = {
      ...complete,
      picks: {},
      comments: [
        { memberId: 'a', text: '하나' },
        { memberId: 'b', text: ' \n ' },
      ],
    };
    expect(getPublishBlockers(blank, ready)).toEqual(['comments']);
  });

  it('저장 중이거나 연결이 끊겨 있으면 막는다', () => {
    expect(getPublishBlockers(complete, { saveStatus: 'saving', offline: false })).toEqual([
      'saving',
    ]);
    expect(getPublishBlockers(complete, { saveStatus: 'saved', offline: true })).toEqual([
      'offline',
    ]);
  });
});

describe('hasOtherEditors', () => {
  it('아무도 편집 중이 아니면 거짓이다', () => {
    expect(hasOtherEditors({}, 'me')).toBe(false);
  });

  it('제목·위치·날짜·사진·코멘트 중 하나라도 다른 멤버가 편집 중이면 참이다', () => {
    expect(hasOtherEditors({ titleMemberIds: ['other'] }, 'me')).toBe(true);
    expect(hasOtherEditors({ locationAddMemberIds: ['other'] }, 'me')).toBe(true);
    expect(hasOtherEditors({ locationEditors: { l1: ['other'] } }, 'me')).toBe(true);
    expect(hasOtherEditors({ dateMemberIds: ['other'] }, 'me')).toBe(true);
    expect(hasOtherEditors({ photoMemberIds: ['other'] }, 'me')).toBe(true);
    expect(hasOtherEditors({ commentMemberIds: ['other'] }, 'me')).toBe(true);
  });

  it('나만 편집 중이면 거짓이다', () => {
    expect(hasOtherEditors({ titleMemberIds: ['me'], commentMemberIds: ['me'] }, 'me')).toBe(false);
  });
});

describe('classifyPublishError', () => {
  const apiError = (status: number, code?: string, data?: unknown) =>
    new ApiError({ message: 'x', category: 'validation', status, code, data });

  it('발행 차단(BUNDLE_005)은 막힘으로, 4xx라 요청 키를 비운다', () => {
    expect(classifyPublishError(apiError(409, 'BUNDLE_005', { error: { detail: {} } }))).toEqual({
      outcome: 'blocked',
      message: BUNDLE_MESSAGES.uploadIncomplete,
      keepKey: false,
    });
  });

  it('버전 충돌·이미 발행됨은 충돌 안내로 실패 처리한다', () => {
    expect(classifyPublishError(apiError(409, 'BUNDLE_002'))).toMatchObject({
      outcome: 'failed',
      message: BUNDLE_MESSAGES.publishConflict,
    });
  });

  it('응답이 없거나 5xx면 같은 요청 키를 유지한다', () => {
    expect(classifyPublishError(new Error('offline'))).toEqual({
      outcome: 'failed',
      message: BUNDLE_MESSAGES.publishFailed,
      keepKey: true,
    });
    expect(classifyPublishError(apiError(503)).keepKey).toBe(true);
  });

  it('408·429는 서버가 이미 발행했을 수 있어 같은 요청 키를 유지한다(새 키로 두 번 발행하지 않게)', () => {
    for (const status of [408, 429]) {
      expect(classifyPublishError(apiError(status))).toEqual({
        outcome: 'failed',
        message: BUNDLE_MESSAGES.publishFailed,
        keepKey: true,
      });
    }
    // 그 밖의 4xx는 확정 거절이라 키를 비움
    expect(classifyPublishError(apiError(404)).keepKey).toBe(false);
  });
});

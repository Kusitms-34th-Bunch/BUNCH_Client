import { describe, expect, it } from 'vitest';
import type { Draft, DraftMember } from './types';
import { getPublishBlockers, hasOtherEditors } from './publish';

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
  photos: [{ id: 'p1', src: '/p1.jpg', alt: '', caption: '', takenAt: null, uploaderId: 'a' }],
  locations: [],
  date: null,
  suggestedDates: [],
  comments: [
    { memberId: 'a', text: '하나' },
    { memberId: 'b', text: '둘' },
  ],
  visibility: 'public',
  editing: {},
};

const ready = { saveStatus: 'saved', offline: false } as const;

describe('getPublishBlockers', () => {
  it('필수 항목을 모두 채우면 막는 것이 없다(위치·날짜·캡션은 조건이 아니다)', () => {
    expect(getPublishBlockers(complete, ready)).toEqual([]);
  });

  it('제목은 앞뒤 공백을 빼고 1자 이상이어야 한다', () => {
    expect(getPublishBlockers({ ...complete, title: '   ' }, ready)).toEqual(['title']);
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
    expect(hasOtherEditors({ title: 'other' }, 'me')).toBe(true);
    expect(hasOtherEditors({ location: 'other' }, 'me')).toBe(true);
    expect(hasOtherEditors({ date: 'other' }, 'me')).toBe(true);
    expect(hasOtherEditors({ photoMemberIds: ['other'] }, 'me')).toBe(true);
    expect(hasOtherEditors({ photoEditors: { p1: ['other'] } }, 'me')).toBe(true);
    expect(hasOtherEditors({ commentMemberIds: ['other'] }, 'me')).toBe(true);
  });

  it('나만 편집 중이면 거짓이다', () => {
    expect(hasOtherEditors({ title: 'me', commentMemberIds: ['me'] }, 'me')).toBe(false);
  });
});

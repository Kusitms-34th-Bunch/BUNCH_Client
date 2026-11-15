import { describe, expect, it } from 'vitest';
import {
  activePresence,
  EMPTY_PRESENCE,
  nextExpiry,
  type PresenceData,
  presenceEventSchema,
  toDraftPresence,
} from './presence';

const at = (seconds: number) => new Date(Date.UTC(2026, 10, 13, 12, 0, seconds)).toISOString();
const NOW = Date.UTC(2026, 10, 13, 12, 0, 0);

const data: PresenceData = {
  members: [
    { memberId: 12, expiresAt: at(15) },
    { memberId: 13, expiresAt: at(15) },
  ],
  typing: [
    { memberId: 12, target: 'COMMENT', text: '지금 입력한 코멘트', expiresAt: at(3) },
    { memberId: 13, target: 'TITLE', text: '부산', expiresAt: at(3) },
  ],
  editing: [
    { memberId: 12, target: 'DATE', expiresAt: at(15) },
    { memberId: 12, target: 'PHOTOS', expiresAt: at(15) },
    { memberId: 13, target: 'PHOTO:901', expiresAt: at(15) },
    { memberId: 13, target: 'LOCATION', expiresAt: at(15) },
    { memberId: 12, target: 'LOCATION:301', expiresAt: at(15) },
    { memberId: 13, target: 'VISIBILITY', expiresAt: at(15) },
    { memberId: 13, target: 'PARTICIPANTS', expiresAt: at(15) },
  ],
};

describe('presenceEventSchema', () => {
  it('PRESENCE 이벤트의 data를 읽고 다른 type은 거절한다', () => {
    expect(
      presenceEventSchema.safeParse({ type: 'PRESENCE', revision: null, requestId: null, data })
        .success,
    ).toBe(true);
    expect(presenceEventSchema.safeParse({ type: 'TITLE', data }).success).toBe(false);
    expect(presenceEventSchema.safeParse({ type: 'PRESENCE', data: { members: [] } }).success).toBe(
      false,
    );
  });
});

describe('activePresence·nextExpiry', () => {
  it('정확히 expiresAt에 도달하면 만료로 보고 읽지 못하는 시각은 버린다', () => {
    const result = activePresence(data, NOW + 3_000);

    expect(result.typing).toEqual([]);
    expect(result.members).toHaveLength(2);
    expect(
      activePresence({ ...EMPTY_PRESENCE, members: [{ memberId: 1, expiresAt: 'x' }] }, NOW)
        .members,
    ).toEqual([]);
  });

  it('가장 먼저 만료되는 시각을 돌려주고 항목이 없으면 undefined다', () => {
    expect(nextExpiry(data)).toBe(NOW + 3_000);
    expect(nextExpiry(EMPTY_PRESENCE)).toBeUndefined();
  });
});

describe('toDraftPresence', () => {
  const result = toDraftPresence(data);

  it('들어와 있는 멤버를 초록 점 기준으로 돌려준다', () => {
    expect(result.viewingMemberIds).toEqual(['12', '13']);
  });

  it('제목·코멘트는 실제 입력 중인 멤버만, 코멘트는 입력한 글자도 함께 보관한다', () => {
    expect(result.editing.titleMemberIds).toEqual(['13']);
    expect(result.editing.commentMemberIds).toEqual(['12']);
    expect(result.editing.commentTexts).toEqual({ '12': '지금 입력한 코멘트' });
  });

  it('사진은 PHOTOS와 PHOTO:{id}를 한곳에 모으고 날짜·위치는 영역별로 나눈다', () => {
    expect(result.editing.photoMemberIds).toEqual(['12', '13']);
    expect(result.editing.dateMemberIds).toEqual(['12']);
    expect(result.editing.locationAddMemberIds).toEqual(['13']);
    expect(result.editing.locationEditors).toEqual({ '301': ['12'] });
  });

  it('공개 범위·참여자 작업은 표시하지 않고 같은 멤버가 여러 연결이어도 한 번만 보인다', () => {
    const shown = toDraftPresence({
      ...EMPTY_PRESENCE,
      editing: [
        { memberId: 5, target: 'VISIBILITY', expiresAt: at(15) },
        { memberId: 5, target: 'PHOTOS', expiresAt: at(15) },
        { memberId: 5, target: 'PHOTO:7', expiresAt: at(15) },
      ],
    });

    expect(shown.editing.photoMemberIds).toEqual(['5']);
    expect(shown.editing.dateMemberIds).toEqual([]);
  });

  it('형식이 틀린 항목 target(선행 0·문자)은 무시한다', () => {
    const shown = toDraftPresence({
      ...EMPTY_PRESENCE,
      editing: [
        { memberId: 5, target: 'PHOTO:01', expiresAt: at(15) },
        { memberId: 5, target: 'LOCATION:abc', expiresAt: at(15) },
      ],
    });

    expect(shown.editing.photoMemberIds).toEqual([]);
    expect(shown.editing.locationEditors).toEqual({});
  });
});

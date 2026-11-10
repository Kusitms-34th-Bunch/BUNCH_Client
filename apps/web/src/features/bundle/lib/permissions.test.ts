import { describe, expect, it } from 'vitest';
import type { Draft, DraftMember, DraftViewer } from './types';
import { canRemoveMember, getDraftAccess, getMemberBadge } from './permissions';

const member = (id: string, overrides: Partial<DraftMember> = {}): DraftMember => ({
  id,
  name: id,
  bunchRole: 'member',
  isCreator: false,
  ...overrides,
});

const creator = member('creator', { isCreator: true });
const admin = member('admin', { bunchRole: 'owner' });
const coAdmin = member('co', { bunchRole: 'coOwner' });
const plain = member('plain');
const other = member('other');

const draft: Draft = {
  id: 'd',
  members: [creator, admin, coAdmin, plain, other],
  title: '',
  photos: [],
  locations: [],
  date: null,
  suggestedDates: [],
  comments: [],
  visibility: 'public',
  editing: {},
};

const viewer = (memberId: string, bunchRole: DraftViewer['bunchRole'] = 'member'): DraftViewer => ({
  memberId,
  bunchRole,
});

describe('getDraftAccess', () => {
  it('참여 멤버는 편집하고 멤버를 추가할 수 있다', () => {
    const access = getDraftAccess(draft, viewer('plain'));
    expect(access).toMatchObject({ participant: true, canEdit: true, canAddMember: true });
  });

  it('초안 생성자와 참여 중인 관리자·공동 관리자만 발행할 수 있다', () => {
    expect(getDraftAccess(draft, viewer('creator')).canPublish).toBe(true);
    expect(getDraftAccess(draft, viewer('admin', 'owner')).canPublish).toBe(true);
    expect(getDraftAccess(draft, viewer('co', 'coOwner')).canPublish).toBe(true);
    expect(getDraftAccess(draft, viewer('plain')).canPublish).toBe(false);
  });

  it('사진은 발행과 같은 사람(초안 생성자·관리자·공동 관리자인 참여 멤버)만 더할 수 있다', () => {
    expect(getDraftAccess(draft, viewer('creator')).canAddPhoto).toBe(true);
    expect(getDraftAccess(draft, viewer('admin', 'owner')).canAddPhoto).toBe(true);
    expect(getDraftAccess(draft, viewer('co', 'coOwner')).canAddPhoto).toBe(true);
    expect(getDraftAccess(draft, viewer('plain')).canAddPhoto).toBe(false);
    expect(getDraftAccess(draft, viewer('outsider', 'owner')).canAddPhoto).toBe(false);
  });

  it('참여 멤버가 아니면 관리자여도 보기만 가능하다', () => {
    const access = getDraftAccess(draft, viewer('outsider', 'owner'));
    expect(access).toEqual({
      participant: false,
      canEdit: false,
      canAddMember: false,
      canPublish: false,
      canAddPhoto: false,
    });
  });
});

describe('canRemoveMember', () => {
  it('초안 생성자는 다른 멤버를 뺄 수 있지만 자기 카드에는 없다', () => {
    expect(canRemoveMember(draft, viewer('creator'), plain)).toBe(true);
    expect(canRemoveMember(draft, viewer('creator'), creator)).toBe(false);
  });

  it('참여 중인 관리자는 초안 생성자를 뺄 수 없다', () => {
    const me = viewer('admin', 'owner');
    expect(canRemoveMember(draft, me, plain)).toBe(true);
    expect(canRemoveMember(draft, me, creator)).toBe(false);
    expect(canRemoveMember(draft, me, admin)).toBe(false);
  });

  it('일반 멤버에게는 삭제 버튼이 없다', () => {
    expect(canRemoveMember(draft, viewer('plain'), other)).toBe(false);
  });

  it('참여 멤버가 아닌 관리자에게는 삭제 버튼이 없다', () => {
    expect(canRemoveMember(draft, viewer('outsider', 'owner'), plain)).toBe(false);
  });
});

describe('getMemberBadge', () => {
  it('관리자 > 공동 관리자 > 초안 생성자 순서로 하나만 고른다', () => {
    expect(getMemberBadge(member('a', { bunchRole: 'owner', isCreator: true }))).toBe('owner');
    expect(getMemberBadge(member('a', { bunchRole: 'coOwner', isCreator: true }))).toBe('coOwner');
    expect(getMemberBadge(creator)).toBe('draftAuthor');
    expect(getMemberBadge(plain)).toBeUndefined();
  });
});

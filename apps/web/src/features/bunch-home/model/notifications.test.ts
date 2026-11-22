import { describe, expect, it } from 'vitest';
import { notificationPath, toBunchNotifications } from './notifications';

const target = (kind: string, ids: Record<string, number> = {}) => ({ kind, bunchId: 1, ...ids });

describe('notificationPath', () => {
  it.each([
    ['MEMBERS', {}, '/bunch/members'],
    ['ROLE_PERMISSIONS', {}, '/bunch/members/roles'],
    ['DRAFT', { bundleId: 7 }, '/bunch/drafts/7'],
    ['BUNDLE', { bundleId: 7 }, '/bunches/1/bundles/7'],
    ['BUNDLE_COMMENTS', { bundleId: 7 }, '/bunches/1/bundles/7?section=comments'],
    // 다른 번치 번들의 댓글·답글·좋아요: 받은 번치(1)가 아니라 번들 소유 번치(77)
    [
      'BUNDLE_COMMENTS',
      { bundleId: 7, targetBunchId: 77, sourceBunchId: 77 },
      '/bunches/77/bundles/7?section=comments',
    ],
    ['BUNDLE', { bundleId: 7, targetBunchId: 77 }, '/bunches/77/bundles/7'],
    // 댓글·답글 알림은 그 댓글까지(답글이면 답글 ID)
    [
      'BUNDLE_COMMENTS',
      { bundleId: 7, commentId: 912 },
      '/bunches/1/bundles/7?section=comments&comment=912',
    ],
    ['CANDIDATES', {}, '/bunch/bundles/new/members'],
    ['OTHER_BUNCH_PROFILE', { targetBunchId: 3 }, '/bunches/3'],
    // 「작성 중인 번들」 탭으로 바로(5.12.2), 초안 ID가 없는 초안 알림도 같은 탭
    ['DRAFT_LIST', {}, '/bunch?tab=drafts'],
    ['DRAFT', {}, '/bunch?tab=drafts'],
    ['ACCESS_NOTICE', { noticeId: 2 }, '/bunch'],
    // 필요한 ID가 없거나 모르는 종류는 번치 홈
    ['BUNDLE', {}, '/bunch'],
    ['OTHER_BUNCH_PROFILE', {}, '/bunch'],
    ['SOMETHING_NEW', {}, '/bunch'],
  ])('%s %o → %s', (kind, ids, path) => {
    expect(notificationPath(target(kind, ids))).toBe(path);
  });
});

it('푸시로 열면 댓글 알림 주소에 via=push를 붙인다(상세가 처음부터 그 댓글 위치)', () => {
  expect(
    notificationPath(target('BUNDLE_COMMENTS', { bundleId: 7, commentId: 9 }), { fromPush: true }),
  ).toBe('/bunches/1/bundles/7?section=comments&comment=9&via=push');
  expect(notificationPath(target('MEMBERS'), { fromPush: true })).toBe('/bunch/members');
});

describe('toBunchNotifications', () => {
  it('서버 제목·내용을 쓰고 readAt이 없으면 읽지 않음, 시각은 경과 시간 글자다', () => {
    const now = Date.parse('2026-11-14T10:00:00.000Z');
    const [unread, read] = toBunchNotifications(
      {
        items: [
          {
            id: 1,
            type: 'MEMBER_JOINED',
            title: '새 멤버',
            body: '확인해 보세요',
            createdAt: '2026-11-14T09:00:00.000Z',
            readAt: null,
            target: target('MEMBERS'),
          },
          {
            id: 2,
            type: 'BUNDLE_LIKED',
            title: '좋아요',
            body: '번들',
            createdAt: '2026-11-14T09:59:30.000Z',
            readAt: '2026-11-14T09:59:50.000Z',
            target: target('BUNDLE', { bundleId: 1 }),
          },
        ],
      },
      now,
    );

    expect(unread).toEqual({
      id: '1',
      title: '새 멤버',
      description: '확인해 보세요',
      time: '1시간 전',
      unread: true,
    });
    expect(read).toMatchObject({ id: '2', time: '방금 전', unread: false });
  });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toPushOpen } from './push-open-core.ts';
import { pushOpenStore } from './push-open-store.ts';

const serverPayload = {
  aps: { alert: { title: '[번치] 내 댓글에 답글이 달렸어요', body: '다음에도 함께 가요' } },
  eventId: 'c340f5c9-1208-4692-a782-cebf4a76b316',
  type: 'SOCIAL_COMMENT_CREATED',
  target: {
    kind: 'BUNDLE_COMMENTS',
    bunchId: 42,
    bundleId: 305,
    targetBunchId: 77,
    sourceBunchId: 77,
    commentId: 912,
    parentCommentId: null,
  },
  notificationId: 801,
};

void test('iOS 원격 푸시의 trigger.payload에서 아는 필드만 골라 꺼낸다', () => {
  assert.deepEqual(toPushOpen({ trigger: { type: 'push', payload: serverPayload }, content: {} }), {
    target: {
      kind: 'BUNDLE_COMMENTS',
      bunchId: 42,
      bundleId: 305,
      targetBunchId: 77,
      sourceBunchId: 77,
      commentId: 912,
    },
    notificationId: 801,
  });
});

void test('trigger에 없으면 content.data를 보고, 알림 ID가 없으면 null이다', () => {
  const { notificationId: _ignored, ...detached } = serverPayload;
  assert.deepEqual(
    toPushOpen({ trigger: { type: 'push' }, content: { data: detached } })?.notificationId,
    null,
  );
});

void test('kind·수신함 번치가 맞지 않거나 payload가 없으면 null이다', () => {
  const withTarget = (target) => ({ trigger: { payload: { ...serverPayload, target } } });
  assert.equal(toPushOpen(withTarget({ kind: '', bunchId: 1 })), null);
  assert.equal(toPushOpen(withTarget({ kind: 'BUNDLE', bunchId: 0 })), null);
  assert.equal(toPushOpen(withTarget({ kind: 'BUNDLE', bunchId: '42' })), null);
  assert.equal(toPushOpen(withTarget({ kind: 'x'.repeat(65), bunchId: 1 })), null);
  assert.equal(toPushOpen({ content: { data: {} } }), null);
  assert.equal(toPushOpen(null), null);
  // 잘못된 ID 필드는 버리고 나머지는 씀
  assert.deepEqual(toPushOpen(withTarget({ kind: 'BUNDLE', bunchId: 1, bundleId: -3 }))?.target, {
    kind: 'BUNDLE',
    bunchId: 1,
  });
});

void test('보관한 알림은 한 번만 가져가고, 같은 응답은 다시 넣지 않으며, 오래되면 버린다', () => {
  const value = toPushOpen({ trigger: { payload: serverPayload } });
  assert.equal(pushOpenStore.set('a', value, 0), true);
  assert.equal(pushOpenStore.set('a', value, 1), false);
  assert.deepEqual(pushOpenStore.take(10), value);
  assert.equal(pushOpenStore.take(11), null);
  assert.equal(pushOpenStore.set('b', value, 0), true);
  assert.equal(pushOpenStore.take(60_001), null);
});

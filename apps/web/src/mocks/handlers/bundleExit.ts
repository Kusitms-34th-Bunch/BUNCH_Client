import { http } from 'msw';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { changeBundle, findScope, snapshotOf } from './bundles';

// 번들 삭제(`DELETE …/bundles/{id}`)와 초안 나가기(`POST …/bundles/{id}/leave`) 명세(PR #32) 기준
const removeBundle = (bundleId: number) =>
  mockDb.update((current) => ({
    ...current,
    bundles: current.bundles.filter((bundle) => bundle.id !== bundleId),
    // 번들 사진·참여자·코멘트는 번들과 함께 사라지고 편집권도 같이 정리함(사진함 원본은 그대로)
    bundleLeases: current.bundleLeases.filter((lease) => lease.bundleId !== bundleId),
  }));

export const bundleExitHandlers = [
  // DELETE /api/v1/bunches/{bunchId}/bundles/{bundleId}
  // 생성자 또는 번치 관리자만, 초안·발행본 모두 삭제하고 data는 null
  http.delete('/api/bunches/:bunchId/bundles/:id', ({ params }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const { bundle, isCreator, isAdmin } = scope;
    if (!(isCreator || isAdmin)) return fail(403, 'AUTH_002');
    removeBundle(bundle.id);
    return ok(null);
  }),

  // POST /api/v1/bunches/{bunchId}/bundles/{bundleId}/leave
  // 초안 참여자만(발행본은 BUNDLE_002), 생성자가 나가면 초안 삭제(data null), 일반 참여자는 참여·코멘트·편집권을 지우고 최신 상세를 받음
  http.post('/api/bunches/:bunchId/bundles/:id/leave', ({ params }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const { bundle, isCreator, isParticipant } = scope;
    if (!isParticipant) return fail(403, 'AUTH_002');
    if (bundle.status === 'PUBLISHED') return fail(409, 'BUNDLE_002');
    if (isCreator) {
      removeBundle(bundle.id);
      return ok(null);
    }
    changeBundle(bundle.id, (current) => ({
      ...current,
      participants: current.participants.filter((p) => p.memberId !== MOCK_MY_MEMBER_ID),
      comments: current.comments.filter((comment) => comment.memberId !== MOCK_MY_MEMBER_ID),
    }));
    mockDb.update((current) => ({
      ...current,
      bundleLeases: current.bundleLeases.filter(
        (lease) => !(lease.bundleId === bundle.id && lease.memberId === MOCK_MY_MEMBER_ID),
      ),
    }));
    return snapshotOf(bundle.id);
  }),
];

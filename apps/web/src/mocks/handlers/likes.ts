import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockDbState } from '../db/types';
import { mockDb } from '../db';
import { fail, ok } from '../lib/envelope';
import { isBlockedBetween, viewerBunchId } from './follows';

/** 번들의 좋아요 수와 지금 번치의 좋아요 여부(피드·상세·좋아요 응답이 함께 씀) */
export const likeOf = (state: MockDbState, viewer: number | undefined, bundleId: number) => {
  // ponytail: 차단 관계 번치의 좋아요도 셈, 차단 반영이 필요해지면 viewer 기준으로 거름
  const likes = state.likes.filter((like) => like.bundleId === bundleId);
  return {
    likeCount: likes.length,
    likedByCurrentBunch: viewer !== undefined && likes.some((like) => like.bunchId === viewer),
  };
};

/**
 * 지금 번치 명의로 그 발행 번들에 반응(좋아요·댓글)할 수 있는지. 안 되면 오류 응답(명세 011~017 공통 순서)
 * 읽기만 하면(`write` false) 소속 번치가 없어도 외부 규칙으로 판단
 */
export const bundleAccess = (state: MockDbState, bundleId: number, write = true) => {
  const viewer = viewerBunchId(state);
  if (write && viewer === undefined) return { error: fail(409, 'BUNCH_010') };
  const bundle = state.bundles.find((item) => item.id === bundleId);
  if (!bundle || bundle.status !== 'PUBLISHED') return { error: fail(404, 'RESOURCE_001') };
  const bunch = state.bunches.find((item) => item.id === bundle.bunchId);
  if (!bunch || isBlockedBetween(state, viewer, bunch.id)) return { error: fail(404, 'BUNCH_009') };
  // 지금 번치 안은 멤버 공개도, 밖은 공개 번들이면서 공개 번치거나 승인된 팔로우일 때만
  if (bunch.id !== viewer) {
    if (bundle.visibility !== 'PUBLIC') return { error: fail(404, 'RESOURCE_001') };
    const approved = state.follows.some(
      (follow) =>
        follow.followerBunchId === viewer &&
        follow.targetBunchId === bunch.id &&
        follow.status === 'FOLLOWING',
    );
    if (bunch.isPrivate && !approved) return { error: fail(403, 'AUTH_002') };
  }
  return { viewer };
};

const setLike = (bundleIdParam: string | readonly string[] | undefined, liked: boolean) => {
  const bundleId = toWireId(bundleIdParam);
  if (bundleId === undefined) return fail(400, 'COMMON_001');
  const access = bundleAccess(mockDb.get(), bundleId);
  if ('error' in access) return access.error;
  const viewer = access.viewer as number;
  // 같은 요청을 반복해도 한 번만 반영(멱등)
  mockDb.update((current) => ({
    ...current,
    likes: [
      ...current.likes.filter((like) => !(like.bunchId === viewer && like.bundleId === bundleId)),
      ...(liked ? [{ bunchId: viewer, bundleId }] : []),
    ],
  }));
  return ok({ bundleId, currentBunchId: viewer, ...likeOf(mockDb.get(), viewer, bundleId) });
};

export const likeHandlers = [
  // PUT /api/v1/bundles/{bundleId}/like
  http.put('/api/bundles/:bundleId/like', ({ params }) => setLike(params.bundleId, true)),
  // DELETE /api/v1/bundles/{bundleId}/like
  http.delete('/api/bundles/:bundleId/like', ({ params }) => setLike(params.bundleId, false)),
];

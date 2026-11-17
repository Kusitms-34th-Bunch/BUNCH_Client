import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import { mockDb } from '../db';
import { fail, ok } from '../lib/envelope';
import { cardOf, followOf, isBlockedBetween, viewerBunchId } from './follows';

// 멤버 프로필(명세 020, Swagger `MemberSocialProfileResponse`). 참여 번치의 팔로우 상태는 지금 번치 기준
// 없는 멤버는 RESOURCE_001(탈퇴·권한 없음과 구분하지 않음), 차단 관계 번치는 뺌
export const memberProfileHandlers = [
  http.get('/api/members/:memberId/social-profile', ({ params }) => {
    const memberId = toWireId(params.memberId);
    if (memberId === undefined) return fail(400, 'COMMON_001');
    const state = mockDb.get();
    const member = state.members.find((item) => item.memberId === memberId);
    if (!member) return fail(404, 'RESOURCE_001');
    const viewer = viewerBunchId(state);
    const bunches = state.memberships
      .filter((membership) => membership.memberId === memberId)
      .filter((membership) => !isBlockedBetween(state, viewer, membership.bunchId))
      .flatMap((membership) => {
        const bunch = cardOf(state, membership.bunchId);
        if (!bunch) return [];
        const follow = followOf(state, viewer, bunch.id);
        return [
          {
            bunch,
            followState: follow?.status ?? 'NONE',
            followId: follow?.id ?? null,
            // 지금 번치 자신과 소속 번치 없음이면 버튼 없음
            showFollowButton: viewer !== undefined && viewer !== bunch.id,
          },
        ];
      });
    return ok({
      memberId,
      nickname: member.nickname,
      imageUrl: member.imageUrl,
      currentBunchId: viewer ?? null,
      bunches,
    });
  }),
];

import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';

// BFF 경로는 백엔드 경로에서 `/api/v1`을 뺀 경로(docs/architecture/api-boundary.md)
export const memberHandlers = [
  // GET /api/v1/members/me
  http.get('/api/members/me', () => {
    const { members, memberships, bunches } = mockDb.get();
    const me = members.find((item) => item.memberId === MOCK_MY_MEMBER_ID);
    if (!me) return fail(401, 'AUTH_001');
    const defaultBunch = bunches.find((bunch) =>
      memberships.some(
        (membership) => membership.memberId === me.memberId && membership.bunchId === bunch.id,
      ),
    );
    return ok({
      memberId: me.memberId,
      nickname: me.nickname,
      imageUrl: me.imageUrl,
      birthYear: me.birthYear,
      gender: me.gender,
      defaultBunch: defaultBunch
        ? {
            id: defaultBunch.id,
            name: defaultBunch.name,
            characterType: defaultBunch.characterType,
            imageUrl: defaultBunch.imageUrl,
          }
        : null,
    });
  }),

  // GET /api/v1/bunches/{bunchId}/members
  http.get('/api/bunches/:bunchId/members', ({ params }) => {
    const bunchId = toWireId(params.bunchId);
    if (bunchId === undefined) return fail(400, 'COMMON_001');
    const { members, memberships, bunches } = mockDb.get();
    if (!bunches.some((bunch) => bunch.id === bunchId)) return fail(404, 'RESOURCE_001');
    const bunchMemberships = memberships.filter((membership) => membership.bunchId === bunchId);
    if (!bunchMemberships.some((membership) => membership.memberId === MOCK_MY_MEMBER_ID)) {
      return fail(403, 'AUTH_002');
    }
    return ok(
      bunchMemberships.flatMap((membership) => {
        const member = members.find((item) => item.memberId === membership.memberId);
        return member
          ? [
              {
                memberId: member.memberId,
                nickname: member.nickname,
                imageUrl: member.imageUrl,
                role: membership.role,
              },
            ]
          : [];
      }),
    );
  }),
];

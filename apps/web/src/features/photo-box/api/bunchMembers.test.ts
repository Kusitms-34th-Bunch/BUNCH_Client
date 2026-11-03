import { INVALID_RESPONSE_CODE } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getBunchMembers } from './bunchMembers';

// 가짜 서버(src/mocks)가 노션 명세와 같은 계약으로 응답. 요청 경로·응답 변환·오류 코드를 함께 확인
describe('getBunchMembers', () => {
  it('가짜 DB의 번치 멤버를 모두 돌려준다', async () => {
    const { memberships } = mockDb.get();
    const members = await getBunchMembers(String(MOCK_BUNCH_ID));

    expect(members).toHaveLength(
      memberships.filter((membership) => membership.bunchId === MOCK_BUNCH_ID).length,
    );
  });

  it('서버 멤버를 사진함 모양(문자열 id, 사진 없으면 undefined)으로 바꾼다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/members', () =>
        ok([
          { memberId: 7, nickname: '지예', imageUrl: 'https://cdn.example/7.jpg', role: 'OWNER' },
          { memberId: 8, nickname: '경진', imageUrl: null, role: 'MEMBER' },
          { memberId: 9, nickname: '수인', imageUrl: '', role: 'CO_OWNER' },
          // 생성 계약상 사진 필드는 생략될 수도 있음
          { memberId: 10, nickname: '하율', role: 'MEMBER' },
        ]),
      ),
    );

    await expect(getBunchMembers('1')).resolves.toEqual([
      { id: '7', name: '지예', avatarSrc: 'https://cdn.example/7.jpg' },
      { id: '8', name: '경진', avatarSrc: undefined },
      { id: '9', name: '수인', avatarSrc: undefined },
      { id: '10', name: '하율', avatarSrc: undefined },
    ]);
  });

  it('요청 경로에 번치 id를 담는다', async () => {
    let requestedBunchId: string | undefined;
    server.use(
      // 쿼리·본문이 있는 요청은 new URL(request.url).searchParams, await request.json()으로 확인
      http.get('/api/bunches/:bunchId/members', ({ params }) => {
        requestedBunchId = String(params.bunchId);
        return ok([]);
      }),
    );

    await getBunchMembers('42');
    expect(requestedBunchId).toBe('42');
  });

  it('없는 번치는 RESOURCE_001 오류다', async () => {
    await expect(getBunchMembers('999')).rejects.toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
  });

  it('내가 속하지 않은 번치는 AUTH_002 오류다', async () => {
    server.use(http.get('/api/bunches/:bunchId/members', () => fail(403, 'AUTH_002')));

    await expect(getBunchMembers('1')).rejects.toMatchObject({
      category: 'auth',
      code: 'AUTH_002',
    });
  });

  it('역할이 명세에 없는 값이면 성공으로 넘기지 않는다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/members', () =>
        ok([{ memberId: 1, nickname: '지예', imageUrl: null, role: 'ADMIN' }]),
      ),
    );

    await expect(getBunchMembers('1')).rejects.toMatchObject({ code: INVALID_RESPONSE_CODE });
  });
});

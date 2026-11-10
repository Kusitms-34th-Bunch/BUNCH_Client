import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { joinInvitation, verifyInvitation } from './invitations';

const CARD = {
  name: '퇴근런클럽',
  introduction: '함께 달리는 우리',
  imageUrl: 'https://cdn.example.com/b.jpg',
  inviterNickname: '뭉치',
  code: 'ABCD2345',
};

describe('verifyInvitation', () => {
  it('초대 입력을 보내고 카드와 참여 가능 여부를 돌려준다', async () => {
    let sent: unknown;
    server.use(
      http.post('/api/invitations/verify', async ({ request }) => {
        sent = await request.json();
        return ok({ card: CARD, eligibility: 'AVAILABLE' });
      }),
    );

    const result = await verifyInvitation('ABCD2345');

    expect(sent).toEqual({ invitation: 'ABCD2345' });
    expect(result).toEqual({
      eligibility: 'AVAILABLE',
      card: {
        name: '퇴근런클럽',
        introduction: '함께 달리는 우리',
        inviterNickname: '뭉치',
        imageUrl: 'https://cdn.example.com/b.jpg',
      },
    });
  });

  it('비어 있는 소개·초대한 사람과 안전하지 않은 사진 주소는 없는 값으로 둔다', async () => {
    server.use(
      http.post('/api/invitations/verify', () =>
        ok({
          card: { ...CARD, introduction: '  ', inviterNickname: null, imageUrl: 'javascript:x' },
          eligibility: 'FULL',
        }),
      ),
    );

    const { card, eligibility } = await verifyInvitation('ABCD2345');

    expect(eligibility).toBe('FULL');
    expect(card).toEqual({ name: '퇴근런클럽' });
  });

  it('무효 초대는 코드를 가진 ApiError로 던진다', async () => {
    server.use(http.post('/api/invitations/verify', () => fail(404, 'INVITE_001')));

    await expect(verifyInvitation('nope')).rejects.toMatchObject({
      code: 'INVITE_001',
      status: 404,
    });
  });
});

describe('joinInvitation', () => {
  it('멱등 키 헤더와 함께 보내고 결과와 화면용 번치를 돌려준다', async () => {
    let received: { key: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/invitations/join', async ({ request }) => {
        received = { key: request.headers.get('idempotency-key'), body: await request.json() };
        return ok({
          outcome: 'JOINED',
          bunch: { id: 9, name: '퇴근런클럽', characterType: 'TYPE_2', imageUrl: null },
        });
      }),
    );

    const joined = await joinInvitation('ABCD2345', 'key-1');

    expect(received).toEqual({ key: 'key-1', body: { invitation: 'ABCD2345' } });
    expect(joined).toEqual({
      outcome: 'JOINED',
      bunch: { id: '9', name: '퇴근런클럽', characterType: 'TYPE_2' },
    });
  });

  it('정원·소속 한도 오류는 코드와 상태를 가진 ApiError로 던진다', async () => {
    server.use(http.post('/api/invitations/join', () => fail(409, 'BUNCH_002')));

    await expect(joinInvitation('ABCD2345', 'key-1')).rejects.toMatchObject({
      code: 'BUNCH_002',
      status: 409,
    });
  });
});

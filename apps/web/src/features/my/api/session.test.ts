import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import {
  clearPendingInvitation,
  readPendingInvitation,
  savePendingInvitation,
} from '@/shared/lib/pendingInvitation';
import { logout } from './session';

describe('MY의 logout', () => {
  beforeEach(() => clearPendingInvitation());

  it('요청을 보내기 전에 보관한 초대를 지운다(기능명세 1.5.1)', async () => {
    savePendingInvitation('ABCD2345');
    let heldWhenRequested: string | null = 'unset';
    server.use(
      http.post('/api/auth/logout', () => {
        heldWhenRequested = readPendingInvitation();
        return fail(503, 'AUTH_018');
      }),
    );

    await expect(logout()).rejects.toBeInstanceOf(Error);

    expect(heldWhenRequested).toBeNull();
  });

  it('서버 요청이 실패해도 이 기기의 보관한 초대는 지워진다', async () => {
    savePendingInvitation('ABCD2345');
    server.use(http.post('/api/auth/logout', () => fail(500, 'COMMON_500')));

    await expect(logout()).rejects.toBeInstanceOf(Error);

    expect(readPendingInvitation()).toBeNull();
  });
});

import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import {
  clearPendingInvitation,
  readPendingInvitation,
  savePendingInvitation,
} from '../lib/pendingInvitation';
import { logout } from './logout';

const order = vi.hoisted((): string[] => []);
const releasePushDevice = vi.hoisted(() => vi.fn());
const syncPushDevice = vi.hoisted(() => vi.fn());
vi.mock('../lib/pushDevice', () => ({ releasePushDevice, syncPushDevice }));

beforeEach(() => {
  clearPendingInvitation();
  order.length = 0;
  releasePushDevice.mockReset();
  syncPushDevice.mockReset();
  syncPushDevice.mockResolvedValue('synced');
  releasePushDevice.mockImplementation(() => {
    order.push('release');
    return Promise.resolve();
  });
});

describe('logout(가입·로그인 화면과 MY 공용)', () => {
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

  it('로그아웃 요청보다 먼저 이 기기의 푸시 기기를 해제한다(세션이 살아 있어야 인증됨)', async () => {
    server.use(
      http.post('/api/auth/logout', () => {
        order.push('logout');
        // 빈 본문 응답은 happy-dom 스트림 오류를 내(ky가 응답을 복제할 때) 본문 있는 200으로 대신함
        return HttpResponse.json({});
      }),
    );

    await logout();

    expect(releasePushDevice).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['release', 'logout']);
  });

  it('푸시 기기 해제는 로그아웃 요청이 실패해도 이미 끝나 있다', async () => {
    server.use(
      http.post('/api/auth/logout', () => {
        order.push('logout');
        return fail(500, 'COMMON_500');
      }),
    );

    await expect(logout()).rejects.toBeInstanceOf(Error);

    expect(order).toEqual(['release', 'logout']);
  });

  it('로그아웃이 실패하면 해제했던 이 기기를 다시 등록하고, 성공하면 다시 등록하지 않는다', async () => {
    server.use(http.post('/api/auth/logout', () => fail(500, 'COMMON_500')));
    await expect(logout()).rejects.toBeInstanceOf(Error);
    expect(syncPushDevice).toHaveBeenCalledTimes(1);

    syncPushDevice.mockClear();
    server.use(http.post('/api/auth/logout', () => HttpResponse.json({})));
    await logout();
    expect(syncPushDevice).not.toHaveBeenCalled();
  });
});

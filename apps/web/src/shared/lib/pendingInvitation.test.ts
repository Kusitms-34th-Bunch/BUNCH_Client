import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingInvitation,
  PENDING_INVITATION_TTL_MS,
  readPendingInvitation,
  savePendingInvitation,
} from './pendingInvitation';

const NOW = 1_700_000_000_000;

describe('pendingInvitation', () => {
  beforeEach(() => clearPendingInvitation());
  afterEach(() => vi.restoreAllMocks());

  it('저장한 초대를 읽고, 지우면 없다', () => {
    expect(readPendingInvitation(NOW)).toBeNull();

    savePendingInvitation('TOKEN-1', NOW);
    expect(readPendingInvitation(NOW + 1000)).toBe('TOKEN-1');

    clearPendingInvitation();
    expect(readPendingInvitation(NOW + 1000)).toBeNull();
  });

  it('가장 최근에 들어온 초대 하나만 남긴다', () => {
    savePendingInvitation('OLD', NOW);
    savePendingInvitation('NEW', NOW + 10);

    expect(readPendingInvitation(NOW + 20)).toBe('NEW');
  });

  it('24시간이 지나면 없는 것으로 취급하고 지운다', () => {
    savePendingInvitation('TOKEN-1', NOW);

    expect(readPendingInvitation(NOW + PENDING_INVITATION_TTL_MS - 1)).toBe('TOKEN-1');
    expect(readPendingInvitation(NOW + PENDING_INVITATION_TTL_MS)).toBeNull();
    // 한 번 만료로 지워지면 시간이 되돌아가도 살아나지 않음
    expect(readPendingInvitation(NOW)).toBeNull();
  });

  it('보관 시각보다 이른 시각(기기 시계 변경)은 믿지 않고 지운다', () => {
    savePendingInvitation('TOKEN-1', NOW);

    expect(readPendingInvitation(NOW - 1)).toBeNull();
  });

  it('깨진 저장값은 없는 것으로 취급한다', () => {
    window.localStorage.setItem('bunch:pending-invitation', '{broken');
    expect(readPendingInvitation(NOW)).toBeNull();

    window.localStorage.setItem('bunch:pending-invitation', JSON.stringify({ invitation: 1 }));
    expect(readPendingInvitation(NOW)).toBeNull();
  });

  it('저장소를 쓸 수 없어도 이번 실행에서는 메모리로 이어진다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    savePendingInvitation('TOKEN-1', NOW);

    expect(readPendingInvitation(NOW + 1)).toBe('TOKEN-1');
  });
});

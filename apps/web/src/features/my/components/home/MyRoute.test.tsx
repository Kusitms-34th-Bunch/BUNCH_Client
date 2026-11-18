import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { MyRoute } from './MyRoute';

// 토스트 표시는 DS의 `toast()` 담당이라 호출만 차단
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

beforeEach(() => vi.mocked(toast).mockClear());

const profileResponse = (nickname: string) =>
  ok({ memberId: 1, nickname, imageUrl: null, defaultBunch: null });

describe('MyRoute', () => {
  it('내 프로필을 받으면 닉네임을 보여 준다', async () => {
    server.use(http.get('/api/members/me', () => profileResponse('으누')));

    render(<MyRoute />, { wrapper: createQueryWrapper() });

    expect(await screen.findByRole('link', { name: '으누 프로필 수정' })).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });

  it('불러오는 동안 스크린 리더에 안내하고, 받으면 안내를 지운다', async () => {
    server.use(
      http.get('/api/members/me', async () => {
        await delay(50);
        return profileResponse('으누');
      }),
    );

    render(<MyRoute />, { wrapper: createQueryWrapper() });

    expect(screen.getByText('프로필을 불러오는 중이에요')).toBeTruthy();
    await screen.findByRole('link', { name: '으누 프로필 수정' });
    await waitFor(() => expect(screen.queryByText('프로필을 불러오는 중이에요')).toBeNull());
  });

  it('프로필을 불러오지 못하면 오류 토스트를 띄우고 메뉴는 그대로 쓸 수 있다', async () => {
    server.use(http.get('/api/members/me', () => fail(500, 'COMMON_500')));

    render(<MyRoute />, { wrapper: createQueryWrapper() });

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(screen.getByRole('link', { name: '알림 설정' }).getAttribute('href')).toBe(
      '/my/notifications',
    );
    // 닉네임이 비어도 프로필 행 링크가 무엇인지 알 수 있는 이름을 가짐
    expect(screen.getByRole('link', { name: '내 프로필 수정' }).getAttribute('href')).toBe(
      '/my/profile',
    );
  });

  it('화면에 들어올 때마다 프로필을 다시 불러와 바뀐 값을 보여 준다', async () => {
    let nickname = '으누';
    let calls = 0;
    server.use(
      http.get('/api/members/me', () => {
        calls += 1;
        return profileResponse(nickname);
      }),
    );
    const wrapper = createQueryWrapper(createTestQueryClient());

    const first = render(<MyRoute />, { wrapper });
    await screen.findByRole('link', { name: '으누 프로필 수정' });
    first.unmount();

    nickname = '새닉네임';
    render(<MyRoute />, { wrapper });

    // 받아 둔 값을 먼저 보이고 다시 불러온 값으로 바뀜
    expect(await screen.findByRole('link', { name: '새닉네임 프로필 수정' })).toBeTruthy();
    expect(calls).toBe(2);
  });
});

import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { ProfileEditRoute } from './ProfileEditRoute';

const replace = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back }) }));
// 토스트 표시는 DS의 `toast()` 담당이라 호출만 차단
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(toast).mockClear();
  replace.mockClear();
  back.mockClear();
});

describe('ProfileEditRoute', () => {
  it('내 프로필을 받으면 지금 닉네임을 채워 보여 준다', async () => {
    server.use(
      http.get('/api/members/me', () =>
        ok({ memberId: 1, nickname: '으누', imageUrl: null, defaultBunch: null }),
      ),
    );

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper() });

    const input = await screen.findByRole<HTMLInputElement>('textbox', { name: /닉네임/ });
    expect(input.value).toBe('으누');
    expect(replace).not.toHaveBeenCalled();
  });

  it('편집 중에 재조회 응답이 와도 처음 받은 값을 기준으로 둔다', async () => {
    let nickname = '으누';
    server.use(
      http.get('/api/members/me', () =>
        ok({ memberId: 1, nickname, imageUrl: null, defaultBunch: null }),
      ),
    );
    const client = createTestQueryClient();

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper(client) });
    const input = await screen.findByRole<HTMLInputElement>('textbox', { name: /닉네임/ });

    nickname = '바뀐닉네임';
    await client.invalidateQueries({ queryKey: sharedKeys.me() });

    expect(input.value).toBe('으누');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '프로필 수정하기' }).disabled,
    ).toBe(true);
  });

  it('프로필을 불러오지 못하면 오류 토스트를 띄우고 마이페이지로 돌아간다', async () => {
    server.use(http.get('/api/members/me', () => fail(500, 'COMMON_500')));

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요');
    expect(screen.queryByRole('textbox', { name: /닉네임/ })).toBeNull();
  });
});

import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { myKeys } from '../../queries/keys';
import { ProfileEditRoute } from './ProfileEditRoute';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

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

  it('추가 개인정보에 동의했으면 서버에 저장된 출생연도·성별을 채운다', async () => {
    server.use(
      http.get('/api/members/me/additional-info', () =>
        ok({ consented: true, birthYear: 2003, gender: 'FEMALE' }),
      ),
    );

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper() });

    const birthYear = await screen.findByRole<HTMLInputElement>('textbox', { name: /출생연도/ });
    expect(birthYear.value).toBe('2003');
    expect(screen.getByRole('button', { name: '여성' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('동의하지 않았으면 출생연도·성별 칸을 보이지 않는다', async () => {
    server.use(http.get('/api/members/me/additional-info', () => ok({ consented: false })));

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper() });

    await screen.findByRole('textbox', { name: /닉네임/ });
    expect(screen.queryByRole('textbox', { name: /출생연도/ })).toBeNull();
  });

  it('다른 기기에서 철회해 저장이 거부되면 토스트 뒤 다시 받아 출생연도·성별 칸을 숨긴다(기능명세서 7.2.6)', async () => {
    let consented = true;
    server.use(
      http.get('/api/members/me/additional-info', () =>
        ok(consented ? { consented: true, birthYear: 2003 } : { consented: false }),
      ),
      http.get('/api/members/nickname-availability', () =>
        ok({ normalizedValue: '으누누', available: true, status: 'AVAILABLE' }),
      ),
      http.put('/api/members/me/profile', () => fail(400, 'COMMON_001')),
    );
    const user = userEvent.setup();
    render(<ProfileEditRoute />, { wrapper: createQueryWrapper() });
    const nickname = await screen.findByRole('textbox', { name: /닉네임/ });
    await screen.findByRole('textbox', { name: /출생연도/ });

    consented = false;
    await user.type(nickname, '누');
    const submit = screen.getByRole<HTMLButtonElement>('button', { name: '프로필 수정하기' });
    await waitFor(() => expect(submit.disabled).toBe(false));
    await user.click(submit);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    await waitFor(() => expect(screen.queryByRole('textbox', { name: /출생연도/ })).toBeNull());
    // 닉네임은 바꾼 채로 남아 다시 저장할 수 있음
    expect(submit.disabled).toBe(false);
  });

  it('저장에 성공하면 추가 개인정보까지 다시 받은 뒤 돌아가, 다시 들어올 때 새 값이 채워진다', async () => {
    mockDb.update((state) => ({
      ...state,
      members: state.members.map((member) =>
        member.memberId === MOCK_MY_MEMBER_ID
          ? { ...member, additionalInfoConsented: true, birthYear: 2003 }
          : member,
      ),
    }));
    const user = userEvent.setup();
    const client = createTestQueryClient();
    render(<ProfileEditRoute />, { wrapper: createQueryWrapper(client) });
    const birthYear = await screen.findByRole('textbox', { name: /출생연도/ });

    await user.clear(birthYear);
    await user.type(birthYear, '2005');
    const submit = screen.getByRole<HTMLButtonElement>('button', { name: '프로필 수정하기' });
    await waitFor(() => expect(submit.disabled).toBe(false));
    await user.click(submit);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    expect(client.getQueryData(myKeys.additionalInfo())).toMatchObject({ birthYear: 2005 });
  });

  it('추가 개인정보를 불러오지 못해도 마이페이지로 돌아간다', async () => {
    server.use(http.get('/api/members/me/additional-info', () => fail(500, 'COMMON_500')));

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    expect(toastAfterNavigation).toHaveBeenCalledWith(
      '일시적인 오류가 발생했어요. 다시 시도해 주세요',
    );
  });

  it('프로필을 불러오지 못하면 마이페이지로 돌아가고, 오류 토스트는 이동 뒤에 보이게 예약한다', async () => {
    server.use(http.get('/api/members/me', () => fail(500, 'COMMON_500')));

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    expect(toastAfterNavigation).toHaveBeenCalledWith(
      '일시적인 오류가 발생했어요. 다시 시도해 주세요',
    );
    // 이동 중에 바로 뜨는 토스트는 없음
    expect(toast).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: /닉네임/ })).toBeNull();
  });
});

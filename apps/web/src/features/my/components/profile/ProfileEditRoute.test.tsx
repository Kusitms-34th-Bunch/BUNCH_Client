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
vi.mock('@/shared/lib/navigation/toastAfterNavigation', () => ({ toastAfterNavigation }));

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

  it('받아 둔 캐시 값이 아니라 이번 진입에서 다시 받은 값으로 채운다', async () => {
    const client = createTestQueryClient();
    // 내 프로필도 캐시에 있어야 진입 첫 렌더에 옛 값(2003)으로 고정될 수 있는 상황이 됨
    client.setQueryData(sharedKeys.me(), {
      memberId: '1',
      nickname: '으누',
      imageSrc: null,
      bunch: null,
    });
    client.setQueryData(myKeys.additionalInfo(), { consented: true, birthYear: 2003 });
    server.use(
      http.get('/api/members/me/additional-info', () => ok({ consented: true, birthYear: 2005 })),
    );

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper(client) });

    // 받아 둔 값(2003)으로 먼저 보여도 입력이 풀리는 건 이번 진입의 값(2005)을 받은 뒤
    await waitFor(() =>
      expect(screen.getByRole<HTMLInputElement>('textbox', { name: /출생연도/ })).toBeEnabled(),
    );
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /출생연도/ }).value).toBe('2005');
  });

  it('마이페이지가 받아 둔 닉네임은 스켈레톤 없이 바로 보이고, 새 값을 받을 때까지 입력·저장을 막는다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), {
      memberId: '1',
      nickname: '으누',
      imageSrc: null,
      bunch: null,
    });
    // 새 응답은 테스트가 보낼 때까지 보류
    let respond = () => {};
    const held = new Promise<void>((resolve) => {
      respond = resolve;
    });
    server.use(
      http.get('/api/members/me', async () => {
        await held;
        return ok({ memberId: 1, nickname: '으누', imageUrl: null, defaultBunch: null });
      }),
    );

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper(client) });

    const input = screen.getByRole<HTMLInputElement>('textbox', { name: /닉네임/ });
    expect(input.value).toBe('으누');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: '프로필 수정하기' })).toBeDisabled();

    expect(screen.getByText('프로필을 불러오는 중이에요')).toBeInTheDocument();
    // 기다리는 동안 입력 영역이 처리 중임을 알림
    expect(input.closest('fieldset')).toHaveAttribute('aria-busy', 'true');

    respond();
    await waitFor(() => expect(screen.getByRole('textbox', { name: /닉네임/ })).toBeEnabled());
    // 새 값 화면으로 바뀐 것을 알리고, 문서로 빠진 초점을 화면 제목으로 옮김
    expect(screen.getByText('프로필을 불러왔어요')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
  });

  it('터치 기기는 받아 둔 값으로 먼저 그려도, 이번 진입의 값을 받아 입력이 풀린 뒤 닉네임에 초점을 줌(#568)', async () => {
    const matchMedia = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation(
        (query: string) =>
          ({ matches: query === '(pointer: coarse)', media: query }) as MediaQueryList,
      );
    try {
      const client = createTestQueryClient();
      client.setQueryData(sharedKeys.me(), {
        memberId: '1',
        nickname: '으누',
        imageSrc: null,
        bunch: null,
      });
      let respond = () => {};
      const held = new Promise<void>((resolve) => {
        respond = resolve;
      });
      server.use(
        http.get('/api/members/me', async () => {
          await held;
          return ok({ memberId: 1, nickname: '으누', imageUrl: null, defaultBunch: null });
        }),
      );

      render(<ProfileEditRoute />, { wrapper: createQueryWrapper(client) });
      // 받는 동안은 입력란이 잠겨 초점을 주지 않음
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(screen.getByRole('textbox', { name: /닉네임/ })).not.toHaveFocus();

      respond();
      await waitFor(() => expect(screen.getByRole('textbox', { name: /닉네임/ })).toHaveFocus());
    } finally {
      matchMedia.mockRestore();
    }
  });

  it('받아 둔 값 없이 스켈레톤에서 뒤로 가기에 초점이 있었으면, 새 화면이 그려질 때 제목으로 옮기고 도착을 알린다', async () => {
    let respond = () => {};
    const held = new Promise<void>((resolve) => {
      respond = resolve;
    });
    server.use(
      http.get('/api/members/me', async () => {
        await held;
        return ok({ memberId: 1, nickname: '으누', imageUrl: null, defaultBunch: null });
      }),
    );

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper() });

    screen.getByRole('button', { name: '뒤로 가기' }).focus();
    respond();
    await screen.findByRole('textbox', { name: /닉네임/ });
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })),
    );
    expect(screen.getByText('프로필을 불러왔어요')).toBeInTheDocument();
  });

  it('받아 둔 값 화면에서 뒤로 간 뒤 조회가 실패해도 한 번만 돌아간다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), {
      memberId: '1',
      nickname: '으누',
      imageSrc: null,
      bunch: null,
    });
    let respond = () => {};
    const held = new Promise<void>((resolve) => {
      respond = resolve;
    });
    server.use(
      http.get('/api/members/me', async () => {
        await held;
        return fail(500, 'COMMON_500');
      }),
    );
    const user = userEvent.setup();

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper(client) });

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(replace).toHaveBeenCalledTimes(1);
    respond();
    await waitFor(() => expect(client.getQueryState(sharedKeys.me())?.fetchStatus).toBe('idle'));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(toastAfterNavigation).not.toHaveBeenCalled();
  });

  it('새 값을 받는 중에 뒤로 가면, 늦게 온 출생연도로 기준값만 바뀌었어도 나가기 확인을 묻지 않는다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), {
      memberId: '1',
      nickname: '으누',
      imageSrc: null,
      bunch: null,
    });
    let respond = () => {};
    const held = new Promise<void>((resolve) => {
      respond = resolve;
    });
    server.use(
      http.get('/api/members/me', async () => {
        await held;
        return ok({ memberId: 1, nickname: '으누', imageUrl: null, defaultBunch: null });
      }),
      http.get('/api/members/me/additional-info', () =>
        ok({ consented: true, birthYear: 2003, gender: null }),
      ),
    );
    const user = userEvent.setup();

    render(<ProfileEditRoute />, { wrapper: createQueryWrapper(client) });
    await waitFor(() =>
      expect(client.getQueryData(myKeys.additionalInfo())).toMatchObject({ birthYear: 2003 }),
    );

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/my');
    respond();
    await waitFor(() => expect(client.getQueryState(sharedKeys.me())?.fetchStatus).toBe('idle'));
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

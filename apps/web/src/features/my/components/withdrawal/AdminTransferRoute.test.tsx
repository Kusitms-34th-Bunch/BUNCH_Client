import type * as DesignSystem from '@app/design-system';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_MEMBER_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import {
  clearKeepAgreed,
  consumeTransferFromGuide,
  markTransferFromGuide,
  peekKeepAgreed,
} from '../../lib/withdrawalFlow';
import { AdminTransferRoute } from './AdminTransferRoute';

const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back, replace }) }));
vi.mock('@/shared/lib/navigation/toastAfterNavigation', () => ({ toastAfterNavigation: vi.fn() }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

/** 가짜 DB에서 내가 시연 번치 두 곳(여행쥬아·퇴근런클럽)의 메인 관리자, 원래 메인 관리자(지예)는 공동 관리자 */
const makeMeOwner = () =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((membership) =>
      membership.bunchId > 2
        ? membership
        : membership.memberId === MOCK_MEMBER_IDS.me
          ? { ...membership, role: 'OWNER' }
          : membership.memberId === MOCK_MEMBER_IDS.admin
            ? { ...membership, role: 'CO_OWNER' }
            : membership,
    ),
  }));

const roleIn = (bunchId: number, memberId: number) =>
  mockDb.get().memberships.find((m) => m.bunchId === bunchId && m.memberId === memberId)?.role;

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  vi.mocked(toastAfterNavigation).mockClear();
  consumeTransferFromGuide();
  clearKeepAgreed();
  makeMeOwner();
});

let queryClient = createTestQueryClient();
const renderScreen = async () => {
  queryClient = createTestQueryClient();
  render(<AdminTransferRoute />, { wrapper: createQueryWrapper(queryClient) });
  await screen.findByRole('button', { name: '여행쥬아' });
};
const openBunch = (name: string) => userEvent.click(screen.getByRole('button', { name }));
const pick = (bunch: string, member: string) =>
  userEvent.click(
    within(screen.getByRole('group', { name: `${bunch} 멤버` })).getByRole('radio', {
      name: new RegExp(`^${member}`),
    }),
  );
const pickAll = async () => {
  await openBunch('여행쥬아');
  await openBunch('퇴근런클럽');
  await pick('여행쥬아', '경진');
  await pick('퇴근런클럽', '지예');
};

describe('AdminTransferRoute', () => {
  it('서버가 알려 준 메인 관리자 번치를 접힌 상태로 보여 주고 「다음」은 막혀 있다', async () => {
    await renderScreen();

    expect(screen.getByRole('heading', { level: 1, name: '관리자 권한 넘기기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '여행쥬아' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: '퇴근런클럽' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  it('대표 사진이 없는 번치는 소속 번치 목록의 타입으로 기본 이미지를 고르고, 사진이 있으면 그 사진', async () => {
    mockDb.update((state) => ({
      ...state,
      bunches: state.bunches.map((bunch) =>
        bunch.name === '여행쥬아' ? { ...bunch, imageUrl: '/mock/bunches/travel.jpg' } : bunch,
      ),
    }));
    await renderScreen();

    const imageOf = (name: string) => screen.getByRole('button', { name }).querySelector('img');
    expect(imageOf('여행쥬아')).toHaveAttribute('src', '/mock/bunches/travel.jpg');
    // 퇴근런클럽은 TYPE_2(탈퇴 확인 응답에는 타입이 없음)
    await waitFor(() =>
      expect(imageOf('퇴근런클럽')).toHaveAttribute('src', '/images/default-bunch/type-2.svg'),
    );
  });

  it('소속 번치 목록을 받지 못해도 화면은 열리고 대표 사진이 없는 번치는 타입 1 기본 이미지', async () => {
    server.use(http.get('/api/members/me/bunches', () => fail(500, 'COMMON_500')));
    await renderScreen();

    const image = screen.getByRole('button', { name: '퇴근런클럽' }).querySelector('img');
    expect(image).toHaveAttribute('src', '/images/default-bunch/type-1.svg');
  });

  it('소속 번치 목록 응답이 늦어도 넘길 번치는 기다리지 않고 보이고, 이미지는 타입 1로 먼저 보인다', async () => {
    server.use(
      http.get('/api/members/me/bunches', async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    await renderScreen();

    const image = screen.getByRole('button', { name: '퇴근런클럽' }).querySelector('img');
    expect(image).toHaveAttribute('src', '/images/default-bunch/type-1.svg');
  });

  it('번치를 펼치면 나를 뺀 멤버를 고를 수 있고, 공동 관리자는 역할도 읽힌다', async () => {
    await renderScreen();

    await openBunch('여행쥬아');
    const group = screen.getByRole('group', { name: '여행쥬아 멤버' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['1', '2', '3', '4']);
    expect(within(group).getByRole('radio', { name: /^지예\s?, 공동 관리자$/ })).toBeTruthy();
  });

  it('나 혼자 있는 번치는 목록에 넣지 않는다', async () => {
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (m) => m.bunchId !== 2 || m.memberId === MOCK_MEMBER_IDS.me,
      ),
    }));
    await renderScreen();

    expect(screen.queryByRole('button', { name: '퇴근런클럽' })).toBeNull();
  });

  it('모든 번치를 골라야 「다음」이 풀리고, 누르면 번치마다 권한을 넘기고 탈퇴 안내로 돌아간다', async () => {
    await renderScreen();
    await openBunch('여행쥬아');
    await openBunch('퇴근런클럽');
    const next = screen.getByRole('button', { name: '다음' });

    expect(next).toHaveAccessibleDescription(
      '모든 번치에서 새 관리자를 골라 주세요. 2개 중 0개 골랐어요.',
    );
    await pick('여행쥬아', '경진');
    expect(next).toBeDisabled();
    await pick('퇴근런클럽', '지예');
    expect(next).toBeEnabled();
    expect(next).toHaveAccessibleDescription('모든 번치의 새 관리자를 골랐어요.');
    await userEvent.click(next);

    // 주소로 바로 들어왔으면 탈퇴 안내로 교체 이동하고 확인 체크는 유지하지 않음
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my/withdrawal'));
    expect(peekKeepAgreed()).toBe(false);
    expect(roleIn(1, MOCK_MEMBER_IDS.memberA)).toBe('OWNER');
    expect(roleIn(1, MOCK_MEMBER_IDS.me)).toBe('MEMBER');
    expect(roleIn(2, MOCK_MEMBER_IDS.admin)).toBe('OWNER');
    // 돌아가는 동안 다시 누를 수 없고 목록은 그대로
    expect(next).toBeDisabled();
    expect(screen.getByRole('button', { name: /^여행쥬아/ })).toBeTruthy();
  });

  it('탈퇴 안내에서 들어왔으면 완료 뒤 뒤로 가기로 돌아가고 확인 체크를 유지한다', async () => {
    markTransferFromGuide();
    await renderScreen();
    await pickAll();

    await userEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(replace).not.toHaveBeenCalled();
    expect(peekKeepAgreed()).toBe(true);
  });

  it('한 번치라도 넘기지 못하면 머물고, 다시 받은 목록에서 남은 번치만 다시 고른다', async () => {
    server.use(
      http.post('/api/bunches/2/owner-transfer', () => fail(409, 'MOCK_MEMBERSHIP_VERSION')),
    );
    const { toast } = await import('@app/design-system');
    await renderScreen();
    await pickAll();

    await userEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(back).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    // 넘긴 여행쥬아는 빠지고 퇴근런클럽만 남음
    await waitFor(() => expect(screen.queryByRole('button', { name: /^여행쥬아/ })).toBeNull());
    expect(screen.getByRole('button', { name: /^퇴근런클럽/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
  });

  it('고른 멤버가 다시 받은 목록에서 빠지면 그 번치는 고르지 않은 것으로 보고 「다음」을 막는다', async () => {
    await renderScreen();
    await pickAll();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();

    // 고른 경진이 여행쥬아를 나간 뒤 목록을 다시 받음(창 복귀 등)
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (m) => !(m.bunchId === 1 && m.memberId === MOCK_MEMBER_IDS.memberA),
      ),
    }));
    await act(() => queryClient.invalidateQueries());

    await waitFor(() => expect(screen.getByRole('button', { name: '다음' })).toBeDisabled());
    expect(screen.getByRole('button', { name: '다음' })).toHaveAccessibleDescription(
      '모든 번치에서 새 관리자를 골라 주세요. 2개 중 1개 골랐어요.',
    );
  });

  it('넘길 번치가 없으면 탈퇴 안내로 돌아간다', async () => {
    mockDb.reset();
    render(<AdminTransferRoute />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my/withdrawal'));
    expect(toastAfterNavigation).not.toHaveBeenCalled();
  });

  it('탈퇴 안내에서 들어왔는데 넘길 번치가 없으면 탈퇴 안내로 돌아가고 확인 체크를 유지한다', async () => {
    mockDb.reset();
    markTransferFromGuide();
    render(<AdminTransferRoute />, { wrapper: createQueryWrapper() });

    // 기록이 없는 테스트 환경이라 useBackOr가 탈퇴 안내로 바꿔 이동
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my/withdrawal'));
    expect(peekKeepAgreed()).toBe(true);
  });

  it('보내는 중에는 다시 눌러도 번치마다 한 번씩만 보내고 새 관리자 선택을 잠근다', async () => {
    let calls = 0;
    const releases: (() => void)[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/owner-transfer', async () => {
        calls += 1;
        await new Promise<void>((resolve) => releases.push(resolve));
        return HttpResponse.json({ success: true, data: { membershipVersion: 2 } });
      }),
    );
    await renderScreen();
    await pickAll();
    const next = screen.getByRole('button', { name: '다음' });

    await userEvent.click(next);
    await waitFor(() => expect(calls).toBe(2));
    expect(next).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(next);
    expect(calls).toBe(2);
    // 보낸 사람과 화면의 선택이 달라지지 않게 라디오가 잠김
    expect(screen.getByRole('radio', { name: /^은우/ })).toBeDisabled();

    releases.forEach((release) => release());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my/withdrawal'));
    expect(calls).toBe(2);
  });

  it('목록을 받지 못하면 탈퇴 안내로 돌아가 그 화면에서 실패를 알린다', async () => {
    server.use(http.get('/api/members/me/withdrawal/check', () => fail(500, 'COMMON_500')));
    render(<AdminTransferRoute />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my/withdrawal'));
    expect(toastAfterNavigation).toHaveBeenCalledWith(
      '일시적인 오류가 발생했어요. 다시 시도해 주세요',
    );
  });

  it('새 관리자를 고른 번치는 접혔을 때 고른 멤버를 함께 읽는다', async () => {
    await renderScreen();
    await openBunch('여행쥬아');
    await pick('여행쥬아', '경진');

    await userEvent.click(screen.getByRole('button', { name: /^여행쥬아/ }));

    expect(screen.getByRole('button', { name: /^여행쥬아\s?, 새 관리자: 경진$/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('뒤로 가기는 기록이 없으면 탈퇴 안내로 가고 아무것도 넘기지 않는다', async () => {
    await renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/my/withdrawal');
    expect(roleIn(1, MOCK_MEMBER_IDS.me)).toBe('OWNER');
  });
});

import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { reloadTo } from '../../lib/navigation';
import { WithdrawalScreen } from './WithdrawalScreen';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));
vi.mock('../../lib/navigation', () => ({ openExternal: vi.fn(), reloadTo: vi.fn() }));
// 토스트 표시는 DS의 `toast()` 담당이라 호출만 차단
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

beforeEach(() => {
  push.mockClear();
  back.mockClear();
  replace.mockClear();
  vi.mocked(reloadTo).mockClear();
  vi.mocked(toast).mockClear();
});

const renderScreen = (hasOwnedBunch = false) =>
  render(<WithdrawalScreen hasOwnedBunch={hasOwnedBunch} />, { wrapper: createQueryWrapper() });

const agreeAndNext = async () => {
  await userEvent.click(screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' }));
  await userEvent.click(screen.getByRole('button', { name: '다음' }));
};

describe('WithdrawalScreen', () => {
  it('삭제되는 정보와 남는 기록을 묶음으로 보여 준다', () => {
    renderScreen();

    expect(
      screen.getByRole('heading', { level: 1, name: '탈퇴하기 전에 확인해 주세요' }),
    ).toBeTruthy();
    const items = (title: string) =>
      within(screen.getByRole('heading', { level: 2, name: title }).parentElement as HTMLElement)
        .getAllByRole('listitem')
        .map((item) => item.firstElementChild?.textContent);
    expect(items('삭제되는 정보')).toEqual([
      '계정과 개인정보',
      '사진함에 올린 내 사진',
      '작성 중인 번들',
      '번들 속 코멘트',
      '댓글',
    ]);
    expect(items('남는 기록')).toEqual(['번들']);
  });

  it('확인 체크 전에는 「다음」이 막히고, 체크하면 풀리고, 해제하면 다시 막힌다', async () => {
    renderScreen();
    const next = screen.getByRole('button', { name: '다음' });
    const agree = screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' });

    expect(next).toBeDisabled();
    await userEvent.click(agree);
    expect(next).toBeEnabled();
    await userEvent.click(agree);
    expect(next).toBeDisabled();
  });

  it('메인 관리자인 번치가 없으면 최종 확인 뒤 탈퇴하고 로그인 화면으로 간다', async () => {
    // ky afterResponse hook이 빈 본문 응답을 복제하면 happy-dom 스트림 오류 발생(실제 브라우저는 무관), 본문 있는 200으로 대신
    server.use(http.post('/api/auth/logout', () => HttpResponse.json({})));
    renderScreen();

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });
    expect(within(dialog).getByText('계정이 영구 삭제되며, 복구할 수 없어요.')).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: '탈퇴하기' }));

    await waitFor(() => expect(reloadTo).toHaveBeenCalledWith('/login'));
  });

  it('최종 확인에서 「취소」를 누르면 안내 화면에 그대로 남는다', async () => {
    renderScreen();

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' })).toBeChecked();
    expect(reloadTo).not.toHaveBeenCalled();
  });

  it('탈퇴 요청이 실패하면 이동하지 않고 창을 닫고 실패를 알린다', async () => {
    server.use(http.post('/api/auth/logout', () => fail(500, 'COMMON_500')));
    renderScreen();

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '탈퇴하기' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(reloadTo).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.');
    // 체크는 그대로라 바로 다시 시도할 수 있음
    expect(screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' })).toBeChecked();
  });

  it('메인 관리자인 번치가 있으면 권한 이전 안내를 띄우고 「권한 넘기러 가기」로 이동한다', async () => {
    renderScreen(true);

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '관리자로 있는 번치가 있어요' });
    expect(
      within(dialog).getByText('번치의 관리자 권한을 다른 멤버에게 넘긴 뒤 탈퇴할 수 있어요.'),
    ).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: '권한 넘기러 가기' }));

    expect(push).toHaveBeenCalledWith('/my/withdrawal/transfer');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('권한 이전 안내에서 「취소」를 누르면 이동하지 않고 닫는다', async () => {
    renderScreen(true);

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '관리자로 있는 번치가 있어요' });
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it('뒤로 가기는 기록이 없으면 MY로 간다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/my');
  });
});

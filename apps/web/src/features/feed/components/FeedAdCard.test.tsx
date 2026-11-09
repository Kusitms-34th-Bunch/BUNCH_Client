import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { FeedAd } from '../lib/types';
import { clearHiddenAds, readHiddenAds } from '../lib/hiddenAds';
import { FeedAdCard } from './FeedAdCard';

const toast = vi.fn();
const onGone = vi.fn();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

const AD: FeedAd = {
  id: 'ad-1',
  title: '플로디스튜디오',
  imageSrc: '/ad.jpg',
  tagline: '여기서 뭉쳐봐요!',
  picked: false,
};

const setup = (
  bunch: { id: string; name: string } | null = { id: 'b', name: '여행가조' },
  ad: FeedAd = AD,
) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<FeedAdCard ad={ad} onGone={onGone} />, { wrapper: createQueryWrapper(client) });
  return userEvent.setup();
};

const openConfirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '플로디스튜디오 광고 더보기' }));
  return screen.findByRole('dialog', { name: /^이 장소를 숨길까요?/ });
};

beforeEach(() => {
  toast.mockClear();
  onGone.mockClear();
  clearHiddenAds();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FeedAdCard', () => {
  it('더보기 → 확인 시트의 숨기기를 누르면 숨김 안내로 바뀌고 초점을 옮긴다', async () => {
    const user = setup();

    const sheet = await openConfirm(user);
    expect(within(sheet).getByText(/BUNCH 팀이 번치가 모이기 좋은 곳/)).toBeTruthy();
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));

    const notice = await screen.findByText('장소를 숨김 처리 했어요');
    expect(screen.queryByRole('button', { name: /더보기/ })).toBeNull();
    await waitFor(() => expect(notice.closest('article')).toHaveFocus());
    expect(
      screen.getByRole('article', { name: '광고 플로디스튜디오, 장소를 숨김 처리 했어요' }),
    ).toBeTruthy();
    expect(readHiddenAds().has('ad-1')).toBe(true);
  });

  it('숨김 안내를 4초 보여 준 뒤 접히기 시작하고, 끝나면 사라졌다고 알린다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: 'b', name: '여행가조' } });
    render(<FeedAdCard ad={AD} onGone={onGone} />, { wrapper: createQueryWrapper(client) });

    const sheet = await openConfirm(user);
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));
    const notice = await screen.findByText('장소를 숨김 처리 했어요');
    const wrapper = notice.closest('li')!;
    expect(wrapper.classList.contains('opacity-0')).toBe(false);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(wrapper.classList.contains('opacity-0')).toBe(true);
    expect(onGone).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onGone).toHaveBeenCalledWith('ad-1', true);
  });

  it('확인 시트의 취소는 카드를 그대로 둔다', async () => {
    const user = setup();

    const sheet = await openConfirm(user);
    await user.click(within(sheet).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: /더보기/ })).toBeTruthy();
    expect(readHiddenAds().has('ad-1')).toBe(false);
  });

  it('소속 번치가 없어도 숨길 수 있다', async () => {
    const user = setup(null);

    const sheet = await openConfirm(user);
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));

    expect(await screen.findByText('장소를 숨김 처리 했어요')).toBeTruthy();
  });

  it('「콕하기」는 토스트 없이 「콕 했어요」로 바꾸고, 빠른 둘째 탭은 무시한다', async () => {
    const user = setup();
    const pick = screen.getByRole('button', { name: '콕하기' });

    await user.dblClick(pick);

    expect(screen.getByRole('button', { name: '콕 했어요' })).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });

  it('간격을 두고 다시 누르면 콕 취소 확인 창을 연다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: 'b', name: '여행가조' } });
    render(<FeedAdCard ad={AD} onGone={onGone} />, { wrapper: createQueryWrapper(client) });

    await user.click(screen.getByRole('button', { name: '콕하기' }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await user.click(screen.getByRole('button', { name: '콕 했어요' }));

    expect(await screen.findByRole('alertdialog')).toBeTruthy();
  });

  it('「콕 했어요」는 확인 창을 열고, 「삭제하기」면 「콕하기」로 돌린다', async () => {
    const user = setup(undefined, { ...AD, picked: true });

    await user.click(screen.getByRole('button', { name: '콕 했어요' }));
    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    expect(
      within(dialog).getByText('‘플로디스튜디오’가 번치의 콕한 장소에서 삭제돼요.'),
    ).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    expect(await screen.findByRole('button', { name: '콕하기' })).toBeTruthy();
  });

  it('소속 번치가 없으면 담긴 표시가 없고 눌러도 바뀌지 않으며 안내한다', async () => {
    const user = setup(null, { ...AD, picked: true });

    await user.click(screen.getByRole('button', { name: '콕하기' }));

    expect(screen.getByRole('button', { name: '콕하기' })).toBeTruthy();
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.', expect.anything());
  });
});

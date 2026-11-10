import type * as DesignSystem from '@app/design-system';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/shared/query/testing';
import { BunchPlaces } from './BunchPlaces';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push }),
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => vi.clearAllMocks());

const renderPlaces = () =>
  render(<BunchPlaces backHref="/bunch" feedHref="/feed" />, { wrapper: createQueryWrapper() });

const openMenu = async (user: ReturnType<typeof userEvent.setup>, place: string, item: string) => {
  await user.click(screen.getByRole('button', { name: `${place} 더보기` }));
  await user.click(await screen.findByRole('button', { name: item }));
};

describe('BunchPlaces', () => {
  it('주소를 클립보드에 복사하고 토스트로 알린다', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderPlaces();

    await openMenu(user, '봄날카페', '주소 복사하기');

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('제주 제주시 애월읍'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        '주소를 복사했어요.',
        expect.objectContaining({ icon: 'success' }),
      ),
    );
  });

  it('복사에 실패하면 오류 토스트를 보인다', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    renderPlaces();

    await openMenu(user, '봄날카페', '주소 복사하기');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
  });

  it('콕에서 빼면 목록과 칩 숫자가 바로 줄고, 토스트의 「되돌리기」로 원래대로 돌린다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    expect(screen.getByRole('radio', { name: '전체 12' })).toBeInTheDocument();

    await openMenu(user, '해리단길', '콕에서 빼기');

    await waitFor(() => expect(screen.queryByText('해리단길')).toBeNull());
    expect(screen.getByRole('radio', { name: '전체 11' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '은우 4' })).toBeInTheDocument();
    const [, options] = toast.mock.calls.find(([message]) => message === '콕한 장소에서 뺐어요')!;
    expect(options?.action?.label).toBe('되돌리기');

    act(() => options?.action?.onClick());

    expect(await screen.findByText('해리단길')).toBeInTheDocument();
    // 되돌려 다시 생긴 카드로 초점이 옮겨짐
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '해리단길 더보기' })).toHaveFocus(),
    );
    expect(screen.getByRole('radio', { name: '전체 12' })).toBeInTheDocument();
  });

  it('콕에서 빼면 초점이 같은 자리에 온 다음 카드의 더보기 버튼으로 옮겨진다', async () => {
    const user = userEvent.setup();
    renderPlaces();

    await openMenu(user, '해리단길', '콕에서 빼기');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '성수 연무장길 더보기' })).toHaveFocus(),
    );
  });

  it('멤버 칩을 고른 상태에서 마지막 카드를 빼면 초점이 앞 카드로 옮겨진다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    await user.click(screen.getByRole('radio', { name: '수인 2' }));

    await openMenu(user, '양양 서피비치', '콕에서 빼기');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '전주 한옥마을 더보기' })).toHaveFocus(),
    );
  });

  it('볼 수 없는 번들 모달로 빼도 초점이 같은 자리에 온 다음 카드로 옮겨진다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    const card = screen
      .getAllByRole('listitem')
      .find((item) => item.textContent?.includes('안목해변 커피거리'))!;
    const cardButton = within(card)
      .getAllByRole('button')
      .find((button) => !button.getAttribute('aria-label')?.includes('더보기'))!;

    await user.click(cardButton);
    await user.click(
      await within(await screen.findByRole('alertdialog')).findByRole('button', {
        name: '콕에서 빼기',
      }),
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '연남동 책방 더보기' })).toHaveFocus(),
    );
  });

  it('마지막 장소까지 빼면 빈 상태를 보이고 「피드 둘러보기」로 피드에 간다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    await user.click(screen.getByRole('radio', { name: '지예 1' }));

    await openMenu(user, '협재해변', '콕에서 빼기');

    const heading = await screen.findByRole('heading', { name: '아직 콕한 장소가 없어요' });
    // 뺀 카드가 사라져 초점이 갈 곳이 없으면 빈 상태 제목으로 옮김
    await waitFor(() => expect(heading).toHaveFocus());
    await user.click(screen.getByRole('button', { name: '피드 둘러보기' }));
    expect(push).toHaveBeenCalledWith('/feed');
  });
});

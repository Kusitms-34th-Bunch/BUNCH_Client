import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PhotoBox } from './PhotoBox';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
// 로티 재생 라이브러리는 모양을 검증하지 않으므로 mock
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PhotoBox 번들 만들기 연결', () => {
  it('사진을 골라 「번들 만들기」를 확인하면 화면 전체 로딩 뒤 초안 작성 화면으로 이동한다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PhotoBox />);

    await user.click(screen.getByRole('button', { name: '선택' }));
    const photo = screen
      .queryAllByRole('button')
      .find((button) => button.hasAttribute('aria-pressed'))!;
    fireEvent.click(photo);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    await user.click(screen.getByRole('menuitem', { name: '번들 만들기' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '예' }));

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText(PHOTO_BOX_MESSAGES.bundleCreating)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(router.push).toHaveBeenCalledWith('/bunch/drafts/draft-1');
  });
});

import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { BundleDraft } from './BundleDraft';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace }) }));

// 로딩 점의 lottie 엔진은 이 test의 대상이 아니므로 비움
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BundleDraft', () => {
  it('없는 초안은 「삭제된 번들이에요」를 안내하고 번치 홈으로 이동(replace)한다', () => {
    render(<BundleDraft draftId="deleted-draft" />);

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.deletedDraft, { fullWidth: true });
    expect(replace).toHaveBeenCalledWith('/bunch');
  });

  it('형식이 틀려 undefined로 넘어온 id도 같은 안내로 처리한다', () => {
    render(<BundleDraft draftId={undefined} />);

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.deletedDraft, { fullWidth: true });
    expect(replace).toHaveBeenCalledWith('/bunch');
  });

  it('있는 초안은 안내 없이 화면을 보여 준다', () => {
    render(<BundleDraft draftId="draft-1" />);

    expect(screen.getByRole('button', { name: '업로드' })).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('돌아갈 기록이 있으면 뒤로가기는 back()을 쓴다', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    render(<BundleDraft draftId="draft-1" />);

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('돌아갈 기록이 없으면 뒤로가기는 번치 홈으로 이동(replace)한다', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    render(<BundleDraft draftId="draft-1" />);

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(replace).toHaveBeenCalledWith('/bunch');
    expect(back).not.toHaveBeenCalled();
  });

  it('나가기를 확인하면 번치 홈으로 이동(replace)한다', async () => {
    render(<BundleDraft draftId="draft-1" />);

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    expect(replace).toHaveBeenCalledWith('/bunch');
  });
});

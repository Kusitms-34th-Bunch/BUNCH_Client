import type * as DesignSystem from '@app/design-system';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftProvider } from '../../contexts/DraftProvider';
import { BundleDraft } from './BundleDraft';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 초안 화면 동작은 샘플 초안 대역으로 확인하고, 서버 연동은 useDraft 테스트가 가짜 서버로 확인
vi.mock('../../hooks/useDraft', async () => ({
  useDraft: (await import('../../testing/useDraftFixture')).useDraftFixture,
}));

// 나가기의 서버 반영은 대역으로 두고(가짜 서버 연동은 queries·mocks 테스트가 확인), 화면 흐름만 확인
const leaveBundle = vi.fn<(_bundleId: string) => Promise<unknown>>(() => Promise.resolve(null));
vi.mock('../../queries/bundles', () => ({
  useLeaveBundleMutation: () => ({ mutateAsync: leaveBundle }),
}));

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));

// 로딩 점의 lottie 엔진은 이 test의 대상이 아니므로 비움
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

const renderDraft = (draftId: string | undefined) =>
  render(
    <DraftProvider draftId={draftId}>
      <BundleDraft />
    </DraftProvider>,
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BundleDraft', () => {
  it('초안 생성자가 나가기를 확인하면 초안 삭제 토스트와 함께 번치 홈으로 이동(replace)한다', async () => {
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '번들 나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(BUNDLE_MESSAGES.leaveCreatorTitle)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
    expect(leaveBundle).toHaveBeenCalledWith('draft-1');
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_MESSAGES.draftDeleted);
  });

  it('나가기를 연달아 눌러도 서버에는 한 번만 보내고, 끝나면 한 번만 이동한다', async () => {
    let finish!: () => void;
    leaveBundle.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(null);
        }),
    );
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '번들 나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    const confirm = within(dialog).getByRole('button', { name: '나가기' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(leaveBundle).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(toastAfterNavigation).toHaveBeenCalledTimes(1);
  });

  it('나가기를 서버에 보내지 못하면 이동하지 않고 안내한다', async () => {
    leaveBundle.mockRejectedValueOnce(new Error('network'));
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '번들 나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.leaveFailed));
    expect(replace).not.toHaveBeenCalled();
  });

  it('「추가」 카드는 참여 멤버 관리 화면으로 이동(push)한다', async () => {
    renderDraft('draft-1');

    const members = screen.getByRole('region', { name: '참여 멤버' });
    await userEvent.click(within(members).getByRole('button', { name: '추가' }));

    expect(push).toHaveBeenCalledWith('/bunch/drafts/draft-1/members');
  });
});

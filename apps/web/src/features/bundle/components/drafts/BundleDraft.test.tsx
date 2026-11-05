import type * as DesignSystem from '@app/design-system';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftProvider } from '../../contexts/DraftProvider';
import { BundleDraft } from './BundleDraft';

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
  it('없는 초안은 「삭제된 번들이에요」를 안내하고 번치 홈으로 이동(replace)한다', () => {
    renderDraft('deleted-draft');

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.deletedDraft, { fullWidth: true });
    expect(replace).toHaveBeenCalledWith('/bunch');
  });

  it('형식이 틀려 undefined로 넘어온 id도 같은 안내로 처리한다', () => {
    renderDraft(undefined);

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.deletedDraft, { fullWidth: true });
    expect(replace).toHaveBeenCalledWith('/bunch');
  });

  it('있는 초안은 안내 없이 화면을 보여 준다', () => {
    renderDraft('draft-1');

    expect(screen.getByRole('button', { name: '업로드' })).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('사진을 누르면 그 사진의 캡션 화면으로 이동(push)한다', async () => {
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '2번째 사진 캡션 보기' }));

    expect(push).toHaveBeenCalledWith('/bunch/drafts/draft-1/photos/draft-photo-2');
  });

  it('돌아갈 기록이 있으면 뒤로가기는 back()을 쓴다', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('돌아갈 기록이 없으면 뒤로가기는 번치 홈으로 이동(replace)한다', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(replace).toHaveBeenCalledWith('/bunch');
    expect(back).not.toHaveBeenCalled();
  });

  it('초안 생성자가 나가기를 확인하면 초안 삭제 토스트와 함께 번치 홈으로 이동(replace)한다', async () => {
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(BUNDLE_MESSAGES.leaveConfirmTitle)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
    expect(leaveBundle).toHaveBeenCalledWith('draft-1');
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.draftDeleted, { fullWidth: true });
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

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    const confirm = within(dialog).getByRole('button', { name: '나가기' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(leaveBundle).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('나가기를 서버에 보내지 못하면 이동하지 않고 안내한다', async () => {
    leaveBundle.mockRejectedValueOnce(new Error('network'));
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.leaveFailed, { fullWidth: true }),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('「추가」 카드는 참여 멤버 관리 화면으로 이동(push)한다', async () => {
    renderDraft('draft-1');

    const members = screen.getByRole('region', { name: '참여 멤버' });
    await userEvent.click(within(members).getByRole('button', { name: '추가' }));

    expect(push).toHaveBeenCalledWith('/bunch/drafts/draft-1/members');
  });
});

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

  it('사진을 「뒤로」 옮긴 뒤에도 포커스가 같은 사진의 같은 버튼에 남아 연달아 옮길 수 있다', async () => {
    renderDraft('draft-1');
    const moveFirstBack = await screen.findByRole('button', {
      name: BUNDLE_MESSAGES.movePhotoAfterLabel(1),
    });
    const firstPhotoAlt = moveFirstBack.closest('li')?.querySelector('img')?.getAttribute('alt');
    moveFirstBack.focus();
    // jsdom은 요소가 옮겨져도 포커스를 잃지 않지만 실제 브라우저는 잃을 수 있어, 누르는 순간 포커스를 직접 없애 복원 여부를 봄
    moveFirstBack.addEventListener('click', () => moveFirstBack.blur());
    await userEvent.keyboard('{Enter}');

    // 첫 사진이 두 번째 자리로 가면 그 사진의 「뒤로」 버튼(이제 2번째 사진의 버튼)에 포커스가 있음
    const active = document.activeElement as HTMLElement;
    expect(active).toHaveAttribute('data-move', 'after');
    expect(active).toHaveAccessibleName(BUNDLE_MESSAGES.movePhotoAfterLabel(2));
    expect(active.closest('li')?.querySelector('img')?.getAttribute('alt')).toBe(firstPhotoAlt);
    expect(screen.getByText(BUNDLE_MESSAGES.photoMoved(2, 3))).toBeInTheDocument();

    // 이어서 한 번 더 누르면 같은 사진이 세 번째로 가고, 맨 뒤라 「뒤로」는 aria-disabled지만 포커스는 그대로
    await userEvent.keyboard('{Enter}');
    const last = document.activeElement as HTMLElement;
    expect(last).toHaveAccessibleName(BUNDLE_MESSAGES.movePhotoAfterLabel(3));
    expect(last).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(BUNDLE_MESSAGES.photoMoved(3, 3))).toBeInTheDocument();
  });

  it('「추가」 카드는 참여 멤버 관리 화면으로 이동(push)한다', async () => {
    renderDraft('draft-1');

    const members = screen.getByRole('region', { name: '참여 멤버' });
    await userEvent.click(within(members).getByRole('button', { name: '추가' }));

    expect(push).toHaveBeenCalledWith('/bunch/drafts/draft-1/members');
  });

  it('번치 홈에서 만든 초안(from=home)의 뒤로가기는 사진 선택이 아니라 번치 홈으로 이동(replace)한다', async () => {
    window.history.replaceState(null, '', '/bunch/drafts/draft-1?from=home');
    try {
      renderDraft('draft-1');

      await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

      expect(replace).toHaveBeenCalledWith('/bunch');
      expect(back).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });

  it('그 밖의 진입(작성 중인 번들 탭·알림)의 뒤로가기는 들어온 곳으로 돌아간다(back)', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    renderDraft('draft-1');

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftProvider } from '../../contexts/DraftProvider';
import { BundleDraftVisibility } from './BundleDraftVisibility';

// 초안 화면 동작은 샘플 초안 대역으로 확인하고, 서버 연동은 useDraft 테스트가 가짜 서버로 확인
vi.mock('../../hooks/useDraft', async () => ({
  useDraft: (await import('../../testing/useDraftFixture')).useDraftFixture,
}));

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

const renderVisibility = (draftId: string | undefined = 'draft-1') =>
  render(
    <DraftProvider draftId={draftId}>
      <BundleDraftVisibility />
    </DraftProvider>,
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BundleDraftVisibility', () => {
  it('샘플 초안은 공개 범위를 고르기 전에는 「업로드」가 꺼져 있다', async () => {
    renderVisibility();

    expect(await screen.findByRole('button', { name: '업로드' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('radio', { name: '멤버 공개' })).not.toBeChecked();
  });

  it('공개 범위를 고르고 「업로드」하면 이 화면에서 완료 창을 띄우고 「확인」을 눌러야 번치 홈으로 이동(replace)한다', async () => {
    renderVisibility();

    await userEvent.click(await screen.findByRole('radio', { name: '멤버 공개' }));
    await userEvent.click(screen.getByRole('button', { name: '업로드' }));

    const dialog = await screen.findByRole('alertdialog', { name: BUNDLE_MESSAGES.published });
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
  });

  it('돌아갈 기록이 없으면 뒤로 가기가 작성 화면으로 이동한다', async () => {
    renderVisibility();

    await userEvent.click(await screen.findByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/bunch/drafts/draft-1');
  });
});

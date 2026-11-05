import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { createBundle } from '../../api/bundles';
import { DraftProvider } from '../../contexts/DraftProvider';
import { BundleDraft } from './BundleDraft';

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

const WAIT = { timeout: 8000 };

const { P1, P2, P3, P4 } = MOCK_PHOTO_IDS;

// 가짜 서버가 만든 UT 상태 B 초안을 실제 화면으로 시연하는 흐름(서버 시나리오 + useDraft + 화면)
const renderStateB = async () => {
  const created = await createBundle(
    String(MOCK_BUNCH_ID),
    [P1, P2, P3, P4].map(String),
    createIdempotencyKey(),
  );
  render(
    <DraftProvider draftId={created.id}>
      <BundleDraft />
    </DraftProvider>,
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );
  await screen.findByRole('button', { name: '업로드' }, WAIT);
  return created.id;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UT 상태 B 초안 화면', () => {
  it('제목·날짜·위치가 채워져 있고 위치는 은우, 2번 사진은 경진이 편집 중으로 보인다', async () => {
    await renderStateB();

    expect(screen.getByDisplayValue('속초 첫째 날 🌊')).toBeInTheDocument();
    expect(screen.getByText('속초해수욕장')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /은우님이 편집 중/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /경진님이 편집 중/ })).toBeInTheDocument();
  });

  it('위치를 지우려 하면 막히고 위치는 그대로다', async () => {
    await renderStateB();

    await userEvent.click(screen.getByRole('button', { name: '속초해수욕장 지우기' }));

    expect(screen.getByText('속초해수욕장')).toBeInTheDocument();
  });

  it('공개 범위와 내 코멘트를 채우고 업로드를 몇 번 눌러도 편집 중 확인 창이 뜬다', async () => {
    const id = await renderStateB();

    await userEvent.click(screen.getByRole('radio', { name: '멤버 공개' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: /큐시즘 \(나\) 코멘트/ }),
      '재밌었어요',
    );
    await waitFor(() => {
      const stored = mockDb.get().bundles.find((bundle) => String(bundle.id) === id);
      expect(stored?.visibility).toBe('PRIVATE');
      expect(stored?.comments.some((comment) => comment.content === '재밌었어요')).toBe(true);
    }, WAIT);

    for (let i = 0; i < 2; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: '업로드' }));
      const dialog = await screen.findByRole('alertdialog', { name: '편집 중인 멤버가 있어요' });
      await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    }
  });
});

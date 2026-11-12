import type * as DesignSystem from '@app/design-system';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { createBundle } from '../api/bundles';
import { useDraftContext } from './draftContext';
import { DraftProvider } from './DraftProvider';

vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

const bunchId = String(MOCK_BUNCH_ID);
const newDraft = async () =>
  (await createBundle(bunchId, [String(MOCK_PHOTO_IDS.S4)], createIdempotencyKey())).id;

// 보이는 제목과 제목 입력 동작을 노출하는 소비자
function Consumer() {
  const { state, actions } = useDraftContext();
  const title = state.kind === 'ready' ? state.draft.title : state.kind;
  return (
    <>
      <p data-testid="title">{title}</p>
      <button onClick={() => actions.setTitle('이전 초안의 제목')}>입력</button>
    </>
  );
}

describe('DraftProvider', () => {
  it('초안 id가 바뀌면 이전 초안의 보관 입력이 새 초안으로 넘어가지 않는다', async () => {
    const first = await newDraft();
    const second = await newDraft();
    const wrapper = createQueryWrapper(createTestQueryClient());
    const view = render(
      <DraftProvider draftId={first}>
        <Consumer />
      </DraftProvider>,
      { wrapper },
    );
    await waitFor(() => expect(screen.getByTestId('title').textContent).toBe(''));

    // 첫 초안에서 입력한 직후(저장 전) 다른 초안으로 바뀜
    act(() => screen.getByRole('button', { name: '입력' }).click());
    view.rerender(
      <DraftProvider draftId={second}>
        <Consumer />
      </DraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('title').textContent).toBe(''));
    // 새 초안에는 이전 초안의 입력이 저장되지 않음
    await act(() => new Promise((resolve) => setTimeout(resolve, 1500)));
    expect(mockDb.get().bundles.find((bundle) => String(bundle.id) === second)?.title).toBe('');
  });
});

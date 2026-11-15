import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Picks } from '../../lib/picks';
import type { Draft, DraftPhoto } from '../../lib/types';
import { DraftContext, type DraftContextValue } from '../../contexts/draftContext';
import { draftFixture } from '../../fixtures/draft.fixture';
import { BundleDraftPick } from './BundleDraftPick';

vi.mock('@/shared/hooks/useBackOr', () => ({ useBackOr: () => vi.fn() }));

// 서버 저장은 useDraftPicks 테스트에서 확인하므로 여기서는 들어올 때 받아 둔 상세(entry)와 내 픽만 조절
const draftPicks = {
  picks: {} as Picks,
  toggle: vi.fn(),
  entry: undefined as { photos: readonly DraftPhoto[]; picks: Picks } | undefined,
};
// 훅이 받은 「사진이 없음」 콜백(네 번째 인자)을 테스트에서 불러 서버 404를 흉내 냄
let notifyGone: (_photoId: string) => void = () => {};
vi.mock('../../hooks/useDraftPicks', () => ({
  useDraftPicks: (...args: unknown[]) => {
    notifyGone = args[3] as typeof notifyGone;
    return draftPicks;
  },
}));

const viewer = { memberId: 'jiye', bunchRole: 'owner' as const };

const withDraft = (draft: Draft): ReactNode => {
  const value = {
    state: {
      kind: 'ready',
      draft,
      viewer,
      bunchMembers: [],
      saveStatus: 'saved',
      realtime: { down: false, retry: vi.fn() },
      titleReady: true,
      titleFailed: false,
      retryTitle: vi.fn(),
    },
    actions: {},
  } as unknown as DraftContextValue;
  return (
    <DraftContext.Provider value={value}>
      <BundleDraftPick />
    </DraftContext.Provider>
  );
};

const [first, second] = draftFixture.photos;
const draftWith = (overrides: Partial<Draft>): Draft => ({ ...draftFixture, ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
  draftPicks.picks = {};
  draftPicks.entry = undefined;
});

describe('BundleDraftPick 들어온 뒤 고정', () => {
  it('들어올 때 받은 뒤에는 다른 멤버가 지운 사진도 그대로 보이고, 누르면 안내 뒤에 없앤다', async () => {
    draftPicks.entry = { photos: draftFixture.photos, picks: {} };
    const { rerender } = render(withDraft(draftFixture));
    expect(screen.getAllByRole('img')).toHaveLength(draftFixture.photos.length);

    // 다른 멤버가 첫 사진을 번들에서 뺌: 화면은 그대로
    rerender(withDraft(draftWith({ photos: draftFixture.photos.slice(1) })));
    expect(screen.getAllByRole('img')).toHaveLength(draftFixture.photos.length);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '이 사진 픽하기' }));
    const dialog = await screen.findByRole('alertdialog', { name: '삭제된 사진이에요' });
    expect(draftPicks.toggle).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(screen.getAllByRole('img')).toHaveLength(draftFixture.photos.length - 1);
  });

  it('다른 멤버가 새로 픽해도 고정한 값을 보이고, 내 픽은 바로 바뀐다', () => {
    draftPicks.entry = { photos: draftFixture.photos, picks: { [first!.id]: ['suin'] } };
    const { rerender } = render(withDraft(draftWith({ picks: { [first!.id]: ['suin'] } })));
    expect(screen.getByText('1명이 픽했어요')).toBeInTheDocument();

    // 다른 멤버(eunwoo)가 더 픽한 최신 상세가 와도 화면은 그대로
    draftPicks.picks = { [first!.id]: ['suin', 'eunwoo'] };
    rerender(withDraft(draftWith({ picks: { [first!.id]: ['suin', 'eunwoo'] } })));
    expect(screen.getByText('1명이 픽했어요')).toBeInTheDocument();

    // 내가 픽함: 내 픽만 더해짐
    draftPicks.picks = { [first!.id]: ['suin', 'eunwoo', 'jiye'] };
    rerender(withDraft(draftWith({ picks: { [first!.id]: ['suin', 'eunwoo'] } })));
    expect(screen.getByText('2명이 픽했어요')).toBeInTheDocument();
  });

  it('들어올 때 받기 전에는 지금 값을 그대로 보인다', () => {
    draftPicks.entry = undefined;
    const { rerender } = render(withDraft(draftFixture));

    rerender(withDraft(draftWith({ photos: draftFixture.photos.slice(1) })));

    expect(screen.getAllByRole('img')).toHaveLength(draftFixture.photos.length - 1);
    expect(second).toBeDefined();
  });

  it('누른 사진이 서버에 없다고 알려 오면 바로 안내를 띄우고 「확인」으로 목록에서 없앤다', async () => {
    draftPicks.entry = { photos: draftFixture.photos, picks: {} };
    render(withDraft(draftFixture));
    expect(screen.getAllByRole('img')).toHaveLength(draftFixture.photos.length);

    act(() => notifyGone(first!.id));

    const dialog = await screen.findByRole('alertdialog', { name: '삭제된 사진이에요' });
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(screen.getAllByRole('img')).toHaveLength(draftFixture.photos.length - 1);
  });
});

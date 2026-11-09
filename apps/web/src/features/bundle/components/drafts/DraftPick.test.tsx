import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { draftFixture } from '../../fixtures/draft.fixture';
import { DraftPick } from './DraftPick';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@app/design-system', async () => ({
  ...(await vi.importActual<object>('@app/design-system')),
  toast,
}));

const me = draftFixture.members[0]!;
const other = draftFixture.members[1]!;
const viewer: DraftViewer = { memberId: me.id, bunchRole: me.bunchRole };
const withPicks = (pickedBy: readonly string[]): Draft => ({
  ...draftFixture,
  photos: draftFixture.photos.map((photo, index) => (index === 0 ? { ...photo, pickedBy } : photo)),
});

const renderPick = (draft: Draft, who: DraftViewer = viewer) => {
  const togglePick = vi.fn();
  render(<DraftPick draft={draft} viewer={who} actions={{ togglePick }} onBack={() => {}} />);
  return togglePick;
};

describe('DraftPick', () => {
  beforeEach(() => toast.mockClear());

  it('픽 전에는 「이 사진 픽하기」를 보이고 칩을 숨기며, 누르면 첫 사진을 픽한다', async () => {
    const togglePick = renderPick(withPicks([]));

    expect(screen.queryByText(BUNDLE_MESSAGES.pickCount(0))).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: BUNDLE_MESSAGES.pickAction }));

    expect(togglePick).toHaveBeenCalledWith(draftFixture.photos[0]!.id);
  });

  it('픽한 뒤에는 인원과 칩을 보이고 내 칩이 맨 앞이다', () => {
    renderPick(withPicks([other.id, me.id]));

    expect(screen.getByRole('button', { name: BUNDLE_MESSAGES.pickDone })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(BUNDLE_MESSAGES.pickDone);
    expect(screen.getByText(BUNDLE_MESSAGES.pickCount(2))).toBeInTheDocument();
    const names = screen.getAllByRole('listitem').flatMap((item) => {
      const text = item.textContent ?? '';
      return text ? [text] : [];
    });
    expect(names).toEqual([me.name, other.name]);
  });

  it('참여 멤버가 아니면 픽하지 못하고 안내한다', async () => {
    const togglePick = renderPick(withPicks([]), { memberId: 'outsider', bunchRole: 'member' });

    await userEvent.click(screen.getByRole('button', { name: BUNDLE_MESSAGES.pickAction }));

    expect(togglePick).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });
  });
});

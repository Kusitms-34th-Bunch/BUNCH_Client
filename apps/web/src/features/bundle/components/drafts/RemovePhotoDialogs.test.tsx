import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { RemovePhotoDialogs } from './RemovePhotoDialogs';

const dialog = (kind: 'confirm' | undefined, picked: boolean) => (
  <RemovePhotoDialogs kind={kind} picked={picked} onClose={vi.fn()} onConfirm={vi.fn()} />
);

describe('RemovePhotoDialogs', () => {
  it('픽한 사진이면 픽 문구를 보이고, 닫히는 중에는 값이 바뀌어도 문구를 유지한다', () => {
    const { rerender } = render(dialog('confirm', true));
    expect(screen.getByText(BUNDLE_MESSAGES.removePickedTitle)).toBeInTheDocument();

    rerender(dialog(undefined, false));
    expect(screen.queryByText(BUNDLE_MESSAGES.removeConfirmTitle)).not.toBeInTheDocument();
  });

  it('픽이 없는 사진을 다시 열면 일반 문구로 돌아온다', () => {
    const { rerender } = render(dialog('confirm', true));

    rerender(dialog(undefined, false));
    rerender(dialog('confirm', false));

    expect(screen.getByText(BUNDLE_MESSAGES.removeConfirmTitle)).toBeInTheDocument();
    expect(screen.queryByText(BUNDLE_MESSAGES.removePickedTitle)).not.toBeInTheDocument();
  });
});

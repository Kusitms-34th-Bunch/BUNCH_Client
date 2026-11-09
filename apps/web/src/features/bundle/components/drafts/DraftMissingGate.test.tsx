import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftState } from '../../hooks/useDraft';
import { DraftMissingGate } from './DraftMissingGate';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

let state: DraftState = { kind: 'loading' };
vi.mock('../../contexts/draftContext', () => ({ useDraftContext: () => ({ state }) }));

beforeEach(() => {
  vi.clearAllMocks();
  state = { kind: 'loading' };
});

describe('DraftMissingGate', () => {
  it('초안이 있거나 불러오는 중이면 아무 창도 열지 않는다', () => {
    render(<DraftMissingGate />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('삭제된 번들이면 「번들이 삭제됐어요」를 안내하고 「확인」을 눌러야 번치 홈으로 이동한다', async () => {
    state = { kind: 'missing', reason: 'deleted' };
    render(<DraftMissingGate />);

    const dialog = await screen.findByRole('alertdialog', { name: '번들이 삭제됐어요' });
    expect(dialog).toHaveAccessibleDescription(
      '작성 중이던 번들이 삭제되어 더 이상 편집할 수 없어요.',
    );
    // 「확인」 하나만 있고 창 밖을 눌러도 이동하지 않음
    expect(within(dialog).getAllByRole('button')).toHaveLength(1);
    expect(replace).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(replace).toHaveBeenCalledWith('/bunch');
  });

  it('다른 멤버가 업로드한 번들이면 「번들이 업로드됐어요」를 안내한다', async () => {
    state = { kind: 'missing', reason: 'published' };
    render(<DraftMissingGate />);

    const dialog = await screen.findByRole('alertdialog', { name: '번들이 업로드됐어요' });
    expect(dialog).toHaveAccessibleDescription(
      '다른 멤버가 번들을 업로드해 더 이상 편집할 수 없어요.',
    );

    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(replace).toHaveBeenCalledWith('/bunch');
  });
});

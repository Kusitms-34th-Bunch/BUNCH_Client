import type { ReactNode } from 'react';
import { render as renderTree, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { DraftState } from '../../hooks/useDraft';
import { DraftMissingGate } from './DraftMissingGate';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

let state: DraftState = { kind: 'loading' };
vi.mock('../../contexts/draftContext', () => ({ useDraftContext: () => ({ state }) }));

// 내 기본 번치(1)를 받아 둔 상태로 그림
const render = (ui: ReactNode) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { bunch: { id: '1' } });
  return renderTree(ui, { wrapper: createQueryWrapper(client) });
};

beforeEach(() => {
  vi.clearAllMocks();
  state = { kind: 'loading' };
});

describe('DraftMissingGate', () => {
  it('초안이 있거나 불러오는 중이면 아무 창도 열지 않는다', () => {
    render(<DraftMissingGate draftId="9">{null}</DraftMissingGate>);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('삭제된 번들이면 「번들이 삭제됐어요」를 안내하고 「확인」을 눌러야 번치 홈의 작성 중인 번들 탭으로 이동한다', async () => {
    state = { kind: 'missing', reason: 'deleted' };
    render(<DraftMissingGate draftId="9">{null}</DraftMissingGate>);

    const dialog = await screen.findByRole('alertdialog', { name: '번들이 삭제됐어요' });
    expect(dialog).toHaveAccessibleDescription(
      '작성 중이던 번들이 삭제되어 더 이상 편집할 수 없어요.',
    );
    // 「확인」 하나만 있고 창 밖을 눌러도 이동하지 않음
    expect(within(dialog).getAllByRole('button')).toHaveLength(1);
    expect(replace).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(replace).toHaveBeenCalledWith('/bunch?tab=drafts');
  });

  it('발행자 닉네임이 있으면 「{닉네임}님이 번들을 업로드해…」로 안내한다', async () => {
    state = { kind: 'missing', reason: 'published', publisherNickname: '경진' };
    render(<DraftMissingGate draftId="9">{null}</DraftMissingGate>);

    const dialog = await screen.findByRole('alertdialog', { name: '번들이 업로드됐어요' });
    expect(dialog).toHaveAccessibleDescription(
      '경진님이 번들을 업로드해 더 이상 편집할 수 없어요.',
    );
  });

  it('다른 멤버가 업로드한 번들이면 「번들이 업로드됐어요」를 안내하고, 번들 id를 모르면 번치 홈으로 이동한다', async () => {
    state = { kind: 'missing', reason: 'published' };
    render(<DraftMissingGate draftId={undefined}>{null}</DraftMissingGate>);

    const dialog = await screen.findByRole('alertdialog', { name: '번들이 업로드됐어요' });
    expect(dialog).toHaveAccessibleDescription(
      '다른 멤버가 번들을 업로드해 더 이상 편집할 수 없어요.',
    );

    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(replace).toHaveBeenCalledWith('/bunch');
  });

  it('업로드된 번들이면 「확인」으로 그 번들 상세로 이동한다', async () => {
    state = { kind: 'missing', reason: 'published' };
    render(<DraftMissingGate draftId="9">{null}</DraftMissingGate>);

    const dialog = await screen.findByRole('alertdialog', { name: '번들이 업로드됐어요' });
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(replace).toHaveBeenCalledWith('/bunches/1/bundles/9');
  });

  it('창이 떠 있는 동안은 아래 화면(로딩 덮개 포함)을 그리지 않고, 아니면 그대로 그린다', async () => {
    const view = render(
      <DraftMissingGate draftId="9">
        <p>작성 화면</p>
      </DraftMissingGate>,
    );
    expect(screen.getByText('작성 화면')).toBeInTheDocument();

    state = { kind: 'missing', reason: 'published' };
    view.rerender(
      <DraftMissingGate draftId="9">
        <p>작성 화면</p>
      </DraftMissingGate>,
    );

    await screen.findByRole('alertdialog', { name: '번들이 업로드됐어요' });
    expect(screen.queryByText('작성 화면')).not.toBeInTheDocument();
  });

  it('작성 화면에 초점이 있던 채로 창이 뜨면 초점이 창의 「확인」으로 간다', async () => {
    const view = render(
      <DraftMissingGate draftId="9">
        <input aria-label="번들 제목" />
      </DraftMissingGate>,
    );
    screen.getByRole('textbox', { name: '번들 제목' }).focus();

    state = { kind: 'missing', reason: 'published' };
    view.rerender(
      <DraftMissingGate draftId="9">
        <input aria-label="번들 제목" />
      </DraftMissingGate>,
    );

    const dialog = await screen.findByRole('alertdialog', { name: '번들이 업로드됐어요' });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '확인' })).toHaveFocus());
  });
});

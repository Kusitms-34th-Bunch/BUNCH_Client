import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionDialog, ConfirmDialog, Dialog } from './Dialog';

afterEach(cleanup);

const Example = ({ onConfirm = () => {}, onCancel = () => {} }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>열기</button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="사진 초기화"
        description="새 번들을 적용할까요?"
        cancelLabel="취소"
        confirmLabel="적용"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>
  );
};

const openDialog = () => {
  const opener = screen.getByRole('button', { name: '열기' });
  opener.focus();
  fireEvent.click(opener);
  return opener;
};

describe('Dialog', () => {
  it('connects its accessible title and description and focuses cancel', async () => {
    render(<Example />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    openDialog();
    const dialog = await screen.findByRole('alertdialog', { name: '사진 초기화' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('새 번들을 적용할까요?');
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: '취소' })),
    );
  });

  it('requests cancel once and restores focus to the opener', async () => {
    const onCancel = vi.fn();
    render(<Example onCancel={onCancel} />);
    const opener = openDialog();
    fireEvent.click(await screen.findByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('cancels with Escape without confirming', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<Example onCancel={onCancel} onConfirm={onConfirm} />);
    openDialog();
    const cancel = await screen.findByRole('button', { name: '취소' });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
    fireEvent.keyDown(cancel, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ignores outside presses', async () => {
    const onCancel = vi.fn();
    render(<Example onCancel={onCancel} />);
    openDialog();
    await screen.findByRole('alertdialog');
    fireEvent.pointerDown(document.body);
    fireEvent.mouseDown(document.body);
    fireEvent.click(document.body);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('reports completed closing without treating initial closed state as a dismissal', async () => {
    const onOpenChangeComplete = vi.fn();
    const ExampleWithCompletion = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>열기</button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            onOpenChangeComplete={onOpenChangeComplete}
            title="확인"
            confirmLabel="OK"
            cancelLabel="Cancel"
            onConfirm={() => {}}
          />
        </>
      );
    };
    render(<ExampleWithCompletion />);
    expect(onOpenChangeComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '열기' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onOpenChangeComplete).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onOpenChangeComplete.mock.calls.filter(([open]) => open === false)).toHaveLength(1);
  });

  it('leaves confirm closing to the caller', async () => {
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    openDialog();
    fireEvent.click(await screen.findByRole('button', { name: '적용' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('supports a text confirmation alone and a disabled pending action', async () => {
    const onConfirm = vi.fn();
    const props = {
      open: true,
      onOpenChange: vi.fn(),
      title: '안내',
      confirmLabel: '확인',
      onConfirm,
      appearance: 'text' as const,
    };
    const { rerender } = render(<ConfirmDialog {...props} />);
    const confirm = await screen.findByRole('button', { name: '확인' });
    await waitFor(() => expect(document.activeElement).toBe(confirm));
    expect(screen.queryByRole('button', { name: '취소' })).toBeNull();
    rerender(<ConfirmDialog {...props} confirmDisabled />);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('supports compound composition and preserves native attributes', async () => {
    render(
      <Dialog.Root open onOpenChange={() => {}}>
        <Dialog.Content data-testid="content">
          <Dialog.Title>제목</Dialog.Title>
          <Dialog.Footer>
            <Dialog.Confirm aria-label="완료" onClick={() => {}}>
              끝
            </Dialog.Confirm>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>,
    );
    expect(await screen.findByRole('alertdialog', { name: '제목' })).toBe(
      screen.getByTestId('content'),
    );
    expect(screen.getByRole('button', { name: '완료' })).toBeTruthy();
  });

  it('shows the profile image above the title (Profile Side by Side)', async () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="관리자로 지정할까요?"
        image={<img src="avatar.png" alt="" data-testid="avatar" />}
        cancelLabel="아니요"
        confirmLabel="예"
        onConfirm={() => {}}
      />,
    );

    const dialog = await screen.findByRole('alertdialog', { name: '관리자로 지정할까요?' });
    const avatar = screen.getByTestId('avatar');
    expect(dialog.contains(avatar)).toBe(true);
    expect(
      avatar.compareDocumentPosition(screen.getByRole('heading')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('ActionDialog', () => {
  const renderActions = (props: Partial<Parameters<typeof ActionDialog>[0]> = {}) =>
    render(
      <ActionDialog
        open
        onOpenChange={() => {}}
        title="경진님을 어떻게 할까요?"
        actions={[
          { label: '공동 관리자로 지정하기', onClick: () => {} },
          { label: '관리자 권한 넘기기', onClick: () => {} },
          { label: '번치에서 내보내기', onClick: () => {} },
        ]}
        {...props}
      />,
    );

  it('stacks the actions and focuses cancel first', async () => {
    renderActions();

    await screen.findByRole('alertdialog', { name: '경진님을 어떻게 할까요?' });
    const buttons = screen.getAllByRole('button').map((button) => button.textContent);
    expect(buttons).toEqual([
      '공동 관리자로 지정하기',
      '관리자 권한 넘기기',
      '번치에서 내보내기',
      '취소',
    ]);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: '취소' })),
    );
  });

  it('calls only the pressed action and cancels without running any action', async () => {
    const onTransfer = vi.fn();
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    renderActions({
      onCancel,
      onOpenChange,
      actions: [{ label: '관리자 권한 넘기기', onClick: onTransfer }],
    });

    fireEvent.click(await screen.findByRole('button', { name: '관리자 권한 넘기기' }));
    expect(onTransfer).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

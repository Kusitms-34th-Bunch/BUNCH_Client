import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomSheet } from './BottomSheet';

afterEach(cleanup);

const Example = ({
  onOpenChange = () => {},
  disablePointerDismissal,
  handle,
}: {
  onOpenChange?: (_open: boolean) => void;
  disablePointerDismissal?: boolean;
  handle?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>열기</button>
      <BottomSheet.Root
        open={open}
        disablePointerDismissal={disablePointerDismissal}
        onOpenChange={(next) => {
          onOpenChange(next);
          setOpen(next);
        }}
      >
        <BottomSheet.Content handle={handle} data-testid="sheet">
          <BottomSheet.Header>
            <BottomSheet.Title>번치 전환하기</BottomSheet.Title>
            <BottomSheet.Description>참여 중인 번치</BottomSheet.Description>
            <BottomSheet.Close />
          </BottomSheet.Header>
          <BottomSheet.Body>
            <button>퇴근런클럽</button>
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <button>새로운 번치 추가하기</button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet.Root>
    </>
  );
};

const openSheet = () => {
  const opener = screen.getByRole('button', { name: '열기' });
  opener.focus();
  fireEvent.click(opener);
  return opener;
};

describe('BottomSheet', () => {
  it('opens as a modal dialog named by its title and described by its description', async () => {
    render(<Example />);
    expect(screen.queryByRole('dialog')).toBeNull();
    openSheet();
    const sheet = await screen.findByRole('dialog', { name: '번치 전환하기' });
    expect(document.getElementById(sheet.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      '참여 중인 번치',
    );
    expect(screen.getByRole('button', { name: '퇴근런클럽' })).toBeTruthy();
  });

  it('closes with the close button and restores focus to the opener', async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    const opener = openSheet();
    fireEvent.click(await screen.findByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('closes with Escape', async () => {
    render(<Example />);
    openSheet();
    const sheet = await screen.findByRole('dialog');
    fireEvent.keyDown(sheet, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps focus inside while open', async () => {
    render(<Example />);
    openSheet();
    const sheet = await screen.findByRole('dialog');
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
  });

  it('hides the decorative handle from assistive technology and can omit it', async () => {
    const { unmount } = render(<Example />);
    openSheet();
    const sheet = await screen.findByTestId('sheet');
    expect(sheet.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    unmount();

    render(<Example handle={false} />);
    openSheet();
    const withoutHandle = await screen.findByTestId('sheet');
    expect(withoutHandle.querySelector('[aria-hidden="true"]:not(svg)')).toBeNull();
  });

  it('ignores outside press when pointer dismissal is disabled', async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} disablePointerDismissal />);
    openSheet();
    await screen.findByRole('dialog');
    fireEvent.pointerDown(document.body);
    fireEvent.mouseDown(document.body);
    fireEvent.click(document.body);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});

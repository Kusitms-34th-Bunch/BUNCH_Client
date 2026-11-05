import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoreMenuSheet } from './MoreMenuSheet';

afterEach(cleanup);

describe('MoreMenuSheet', () => {
  it('숨은 제목이 시트 이름이고 항목마다 onSelect를 부른다', async () => {
    const onBlock = vi.fn();
    const onReport = vi.fn();
    render(
      <MoreMenuSheet
        open
        onOpenChange={() => {}}
        items={[
          { id: 'block', label: '차단하기', onSelect: onBlock },
          { id: 'report', label: '신고하기', onSelect: onReport },
        ]}
      />,
    );

    expect(await screen.findByRole('dialog', { name: '더보기' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '신고하기' }));

    expect(onReport).toHaveBeenCalledTimes(1);
    expect(onBlock).not.toHaveBeenCalled();
  });

  it('「취소하기」는 닫기를 요청한다', async () => {
    const onOpenChange = vi.fn();
    render(<MoreMenuSheet open onOpenChange={onOpenChange} items={[]} />);

    fireEvent.click(await screen.findByRole('button', { name: '취소하기' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

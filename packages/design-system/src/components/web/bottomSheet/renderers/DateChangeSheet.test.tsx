import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DateChangeSheet } from './DateChangeSheet';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 12));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const Example = ({ onSave = () => {} }: { onSave?: (_date: Date) => void }) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>열기</button>
      <DateChangeSheet open={open} onOpenChange={setOpen} onSave={onSave} />
    </>
  );
};

const saveButton = () => screen.getByRole('button', { name: '저장' });

describe('DateChangeSheet', () => {
  it('오늘이 있는 달을 선택 없이 열고, 「저장」은 이유를 알리며 비활성이다', async () => {
    render(<Example />);

    expect(await screen.findByRole('dialog', { name: '날짜 바꾸기' })).toBeTruthy();
    expect(screen.getByRole('grid', { name: '2026년 10월' })).toBeTruthy();
    expect(saveButton().getAttribute('aria-disabled')).toBe('true');
    expect(
      document.getElementById(saveButton().getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('날짜를 고르면 저장할 수 있어요');
  });

  it('선택 전 「저장」을 눌러도 저장하지 않는다', async () => {
    const onSave = vi.fn();
    render(<Example onSave={onSave} />);
    await screen.findByRole('dialog');

    fireEvent.click(saveButton());

    expect(onSave).not.toHaveBeenCalled();
  });

  it('고른 날짜로 onSave를 부른다', async () => {
    const onSave = vi.fn();
    render(<Example onSave={onSave} />);
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: '2026년 10월 17일' }));
    fireEvent.click(saveButton());

    const saved = onSave.mock.calls[0]?.[0] as Date;
    expect([saved.getFullYear(), saved.getMonth(), saved.getDate()]).toEqual([2026, 9, 17]);
  });

  it('닫았다 다시 열면 선택이 지워진다', async () => {
    render(<Example />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: '2026년 10월 1일' }));
    expect(saveButton().getAttribute('aria-disabled')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: '열기' }));

    await screen.findByRole('dialog');
    expect(saveButton().getAttribute('aria-disabled')).toBe('true');
  });
});

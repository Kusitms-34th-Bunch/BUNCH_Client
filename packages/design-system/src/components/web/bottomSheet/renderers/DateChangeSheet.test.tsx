import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { DateChangeSheet } from './DateChangeSheet';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 12));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const Example = ({
  onSave = () => {},
  defaultDate,
}: {
  onSave?: (_date: Date) => void;
  defaultDate?: Date | undefined;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>열기</button>
      <DateChangeSheet
        open={open}
        onOpenChange={setOpen}
        onSave={onSave}
        defaultDate={defaultDate}
      />
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

  it('닫히는 중 다시 열어도 선택이 지워진다', async () => {
    // 테스트 DOM은 CSS transition을 돌리지 않으므로 끝나지 않는 닫힘 애니메이션으로 시트를 남겨 둠
    const closing = {
      finished: new Promise(() => {}),
      pending: false,
      playState: 'running',
      effect: { getTiming: () => ({ duration: 160, iterations: 1 }) },
    } as unknown as Animation;
    // happy-dom에는 getAnimations가 없어 직접 정의
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: () => [closing],
    });
    onTestFinished(() => {
      delete (Element.prototype as Partial<Element>).getAnimations;
    });
    render(<Example />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: '2026년 10월 1일' }));

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.getByRole('button', { name: '2026년 10월 1일' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '열기', hidden: true }));

    expect(saveButton().getAttribute('aria-disabled')).toBe('true');
  });

  describe('defaultDate', () => {
    const photoDate = new Date(2026, 8, 5, 14, 30);

    it('그 날짜가 있는 달을 열고 그 날짜를 선택한 상태로 보인다', async () => {
      render(<Example defaultDate={photoDate} />);
      await screen.findByRole('dialog');

      expect(screen.getByRole('grid', { name: '2026년 9월' })).toBeTruthy();
      expect(
        screen
          .getByRole('button', { name: '2026년 9월 5일' })
          .parentElement?.getAttribute('aria-selected'),
      ).toBe('true');
    });

    it('그 날짜 그대로는 저장할 수 없고 이유를 알린다', async () => {
      const onSave = vi.fn();
      render(<Example defaultDate={photoDate} onSave={onSave} />);
      await screen.findByRole('dialog');

      expect(saveButton().getAttribute('aria-disabled')).toBe('true');
      expect(
        document.getElementById(saveButton().getAttribute('aria-describedby') ?? '')?.textContent,
      ).toBe('다른 날짜를 고르면 저장할 수 있어요');
      fireEvent.click(saveButton());
      expect(onSave).not.toHaveBeenCalled();
    });

    it('다른 날짜를 고르면 저장할 수 있고 그날 0시로 onSave를 부른다', async () => {
      const onSave = vi.fn();
      render(<Example defaultDate={photoDate} onSave={onSave} />);
      await screen.findByRole('dialog');

      fireEvent.click(screen.getByRole('button', { name: '2026년 9월 12일' }));
      expect(saveButton().getAttribute('aria-disabled')).toBe('false');
      fireEvent.click(saveButton());

      const saved = onSave.mock.calls[0]?.[0] as Date;
      expect([saved.getFullYear(), saved.getMonth(), saved.getDate(), saved.getHours()]).toEqual([
        2026, 8, 12, 0,
      ]);
    });

    it('닫았다 다시 열면 처음 날짜로 돌아간다', async () => {
      render(<Example defaultDate={photoDate} />);
      await screen.findByRole('dialog');
      fireEvent.click(screen.getByRole('button', { name: '2026년 9월 12일' }));

      fireEvent.click(screen.getByRole('button', { name: '닫기' }));
      await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      fireEvent.click(screen.getByRole('button', { name: '열기' }));

      await screen.findByRole('dialog');
      expect(saveButton().getAttribute('aria-disabled')).toBe('true');
    });
  });
});

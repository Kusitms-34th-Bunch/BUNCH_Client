import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarItem } from './CalendarItem';

describe('CalendarItem', () => {
  it('날짜를 버튼으로 보여 주고 누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<CalendarItem onClick={onClick}>4</CalendarItem>);
    const item = screen.getByRole('button', { name: '4' });

    expect(item.getAttribute('type')).toBe('button');

    fireEvent.click(item);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('기본은 흰 배경에 기본 글자색이다', () => {
    render(<CalendarItem>4</CalendarItem>);
    const item = screen.getByRole('button');

    expect(item.className).toContain('bg-surface-primary');
    expect(item.className).toContain('text-text-primary');
    expect(item.className).toContain('rounded-full');
  });

  it('selected면 어두운 배경에 흰 글자다', () => {
    render(<CalendarItem selected>4</CalendarItem>);
    const item = screen.getByRole('button');

    expect(item.className).toContain('bg-surface-inversed');
    expect(item.className).toContain('text-text-inversed');
  });

  it('disabled면 aria-disabled이고 눌러도 onClick을 부르지 않지만 포커스는 받는다', () => {
    const onClick = vi.fn();
    render(
      <CalendarItem disabled onClick={onClick}>
        4
      </CalendarItem>,
    );
    const item = screen.getByRole('button');

    expect(item.getAttribute('aria-disabled')).toBe('true');
    expect((item as HTMLButtonElement).disabled).toBe(false);
    expect(item.className).toContain('text-text-quaternary');

    fireEvent.click(item);

    expect(onClick).not.toHaveBeenCalled();

    item.focus();

    expect(document.activeElement).toBe(item);
  });

  it('disabled가 아니면 aria-disabled가 없다', () => {
    render(<CalendarItem>4</CalendarItem>);

    expect(screen.getByRole('button').hasAttribute('aria-disabled')).toBe(false);
  });

  it('hidden이면 버튼 없이 숨겨진 칸만 그린다', () => {
    const { container } = render(<CalendarItem hidden>4</CalendarItem>);

    expect(screen.queryByRole('button')).toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    // inline span은 크기가 먹히지 않아 칸이 접히므로 block이어야 함
    expect(container.firstElementChild?.classList.contains('block')).toBe(true);
    expect(container.firstElementChild?.classList.contains('size-11.5')).toBe(true);
    expect(container.textContent).toBe('');
  });

  it('className과 button 속성이 합쳐진다', () => {
    render(
      <CalendarItem className="mt-2" data-date="2026-10-04">
        4
      </CalendarItem>,
    );
    const item = screen.getByRole('button');

    expect(item.className).toContain('mt-2');
    expect(item.getAttribute('data-date')).toBe('2026-10-04');
  });
});

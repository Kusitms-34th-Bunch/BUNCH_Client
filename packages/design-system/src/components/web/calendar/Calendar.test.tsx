import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Calendar, type CalendarProps } from './Calendar';

const OCT_2026 = new Date(2026, 9, 1);

const renderCalendar = (props?: CalendarProps) =>
  render(<Calendar defaultMonth={OCT_2026} {...props} />);

/** 날짜 버튼은 "2026년 10월 20일"처럼 연·월·일 이름을 가짐 */
const day = (n: number, month = 10, year = 2026) =>
  screen.getByRole('button', { name: `${year}년 ${month}월 ${n}일` });

const dateButtons = () =>
  screen.getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent ?? ''));

describe('Calendar', () => {
  it('달 제목과 요일, 그 달의 모든 날짜를 그린다', () => {
    renderCalendar();

    expect(screen.getByText('2026년 10월')).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Su',
      'Mo',
      'Tu',
      'We',
      'Th',
      'Fr',
      'Sa',
    ]);
    expect(dateButtons()).toHaveLength(31);
  });

  it('날짜 버튼은 연·월·일을 접근성 이름으로 갖고 보이는 글자는 일 숫자다', () => {
    renderCalendar();

    expect(day(20).textContent).toBe('20');
    expect(day(20).getAttribute('aria-label')).toBe('2026년 10월 20일');
  });

  it('2026년 10월은 목요일에 시작해서 날짜 줄이 5줄이고 빈 칸은 숨겨진다', () => {
    const { container } = renderCalendar();
    const rows = screen.getAllByRole('row');

    // 첫 줄은 요일 줄
    expect(rows).toHaveLength(6);
    expect(rows[1]?.querySelectorAll('button')).toHaveLength(3);
    expect(rows[5]?.querySelectorAll('button')).toHaveLength(7);
    expect(container.querySelectorAll('[role="gridcell"] > span[aria-hidden="true"]')).toHaveLength(
      4,
    );
  });

  it('마지막 줄이 덜 찬 달은 뒤쪽 빈 칸도 숨긴다', () => {
    const { container } = renderCalendar({ defaultMonth: new Date(2026, 10, 1) });

    // 2026년 11월은 일요일 시작과 월요일 종료
    expect(screen.getAllByRole('row')[5]?.querySelectorAll('button')).toHaveLength(2);
    expect(container.querySelectorAll('[role="gridcell"] > span[aria-hidden="true"]')).toHaveLength(
      5,
    );
  });

  it('weekdayLabels로 요일 글자를 바꾸고 같은 글자가 겹쳐도 7칸이다', () => {
    const { rerender } = renderCalendar({
      weekdayLabels: ['일', '월', '화', '수', '목', '금', '토'],
    });

    expect(screen.getAllByRole('columnheader')[0]?.textContent).toBe('일');

    rerender(
      <Calendar defaultMonth={OCT_2026} weekdayLabels={['S', 'M', 'T', 'W', 'T', 'F', 'S']} />,
    );

    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  });

  it('grid는 달 제목으로 이름이 붙는다', () => {
    renderCalendar();

    expect(screen.getByRole('grid', { name: '2026년 10월' })).toBeTruthy();
  });

  it('selected 날짜만 aria-selected이고 어두운 칸이다', () => {
    renderCalendar({ selected: new Date(2026, 9, 20) });

    expect(day(20).parentElement?.getAttribute('aria-selected')).toBe('true');
    expect(day(20).className).toContain('bg-surface-inversed');
    expect(day(21).parentElement?.getAttribute('aria-selected')).toBe('false');
  });

  it('날짜를 누르면 그 날짜로 onSelectDate를 부른다', () => {
    const onSelectDate = vi.fn();
    renderCalendar({ onSelectDate });

    fireEvent.click(day(7));

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectDate.mock.calls[0]?.[0]).toEqual(new Date(2026, 9, 7));
  });

  it('화살표로 달을 옮기고 onMonthChange를 부른다', () => {
    const onMonthChange = vi.fn();
    renderCalendar({ onMonthChange });

    fireEvent.click(screen.getByRole('button', { name: '다음 달' }));

    expect(screen.getByText('2026년 11월')).toBeTruthy();
    expect(onMonthChange).toHaveBeenLastCalledWith(new Date(2026, 10, 1));

    fireEvent.click(screen.getByRole('button', { name: '이전 달' }));
    fireEvent.click(screen.getByRole('button', { name: '이전 달' }));

    expect(screen.getByText('2026년 9월')).toBeTruthy();
  });

  it('12월에서 다음 달은 다음 해 1월이다', () => {
    renderCalendar({ defaultMonth: new Date(2026, 11, 1) });

    fireEvent.click(screen.getByRole('button', { name: '다음 달' }));

    expect(screen.getByText('2027년 1월')).toBeTruthy();
  });

  it('defaultMonth가 없으면 선택된 날짜의 달을 보여 준다', () => {
    render(<Calendar selected={new Date(2027, 2, 9)} />);

    expect(screen.getByText('2027년 3월')).toBeTruthy();
  });

  it('화살표 이름·제목·날짜 이름을 바꿀 수 있다', () => {
    renderCalendar({
      previousMonthLabel: 'Previous month',
      nextMonthLabel: 'Next month',
      formatMonth: (year, month) => `${month}/${year}`,
      formatDate: (date) => `${date.getMonth() + 1}/${date.getDate()}`,
    });

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeTruthy();
    expect(screen.getByRole('grid', { name: '10/2026' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10/20' }).textContent).toBe('20');
  });

  it('minDate·maxDate·isDateDisabled로 고를 수 없는 날은 눌러도 선택되지 않는다', () => {
    const onSelectDate = vi.fn();
    renderCalendar({
      onSelectDate,
      minDate: new Date(2026, 9, 12),
      maxDate: new Date(2026, 9, 24),
      isDateDisabled: (date) => date.getDay() === 0,
    });

    for (const n of [11, 25, 18]) {
      expect(day(n).getAttribute('aria-disabled')).toBe('true');
      fireEvent.click(day(n));
    }
    expect(onSelectDate).not.toHaveBeenCalled();
    expect(day(12).hasAttribute('aria-disabled')).toBe(false);
    expect(day(24).hasAttribute('aria-disabled')).toBe(false);

    fireEvent.click(day(14));

    expect(onSelectDate).toHaveBeenCalledTimes(1);
  });

  it('키보드로 들어갈 칸은 하나뿐이고 선택된 날짜가 우선이다', () => {
    renderCalendar({ selected: new Date(2026, 9, 20) });
    const tabbable = dateButtons().filter((b) => b.getAttribute('tabindex') === '0');

    expect(tabbable.map((b) => b.textContent)).toEqual(['20']);
  });

  it('선택된 날짜가 없으면 1일로 들어간다', () => {
    renderCalendar({ selected: null });

    expect(day(1).getAttribute('tabindex')).toBe('0');
    expect(day(2).getAttribute('tabindex')).toBe('-1');
  });

  it('방향키로 날짜를 옮기고 포커스가 따라간다', () => {
    renderCalendar({ selected: new Date(2026, 9, 20) });
    day(20).focus();

    fireEvent.keyDown(day(20), { key: 'ArrowRight' });

    expect(document.activeElement).toBe(day(21));

    fireEvent.keyDown(day(21), { key: 'ArrowDown' });

    expect(document.activeElement).toBe(day(28));

    fireEvent.keyDown(day(28), { key: 'ArrowLeft' });
    fireEvent.keyDown(day(27), { key: 'ArrowUp' });

    expect(document.activeElement).toBe(day(20));
  });

  it('Home·End는 그 주의 일요일·토요일로 간다', () => {
    renderCalendar({ selected: new Date(2026, 9, 21) });
    day(21).focus();

    fireEvent.keyDown(day(21), { key: 'Home' });

    expect(document.activeElement).toBe(day(18));

    fireEvent.keyDown(day(18), { key: 'End' });

    expect(document.activeElement).toBe(day(24));
  });

  it('달 끝에서 방향키를 누르면 다음 달로 넘어가며 포커스가 따라가고 onMonthChange를 부른다', () => {
    const onMonthChange = vi.fn();
    renderCalendar({ selected: new Date(2026, 9, 31), onMonthChange });
    day(31).focus();

    fireEvent.keyDown(day(31), { key: 'ArrowRight' });

    expect(screen.getByText('2026년 11월')).toBeTruthy();
    expect(document.activeElement).toBe(day(1, 11));
    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 10, 1));
  });

  it('PageDown·PageUp은 한 달, Shift를 함께 누르면 한 해 옮긴다', () => {
    renderCalendar({ selected: new Date(2026, 9, 31) });
    day(31).focus();

    fireEvent.keyDown(day(31), { key: 'PageDown' });

    expect(screen.getByText('2026년 11월')).toBeTruthy();
    expect(document.activeElement).toBe(day(30, 11));

    fireEvent.keyDown(day(30, 11), { key: 'PageUp', shiftKey: true });

    expect(screen.getByText('2025년 11월')).toBeTruthy();
    expect(document.activeElement).toBe(day(30, 11, 2025));

    fireEvent.keyDown(day(30, 11, 2025), { key: 'PageDown', shiftKey: true });

    expect(screen.getByText('2026년 11월')).toBeTruthy();
    expect(document.activeElement).toBe(day(30, 11));
  });

  it('Alt·Ctrl·Meta와 함께 누른 키는 가로채지 않는다', () => {
    renderCalendar({ selected: new Date(2026, 9, 20) });
    day(20).focus();

    for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) {
      const notPrevented = fireEvent.keyDown(day(20), { key: 'ArrowRight', [modifier]: true });

      expect(notPrevented).toBe(true);
      expect(document.activeElement).toBe(day(20));
    }
  });

  it('고를 수 없는 날에도 키보드로 포커스는 갈 수 있다', () => {
    renderCalendar({ selected: new Date(2026, 9, 20), maxDate: new Date(2026, 9, 20) });
    day(20).focus();

    fireEvent.keyDown(day(20), { key: 'ArrowRight' });

    expect(document.activeElement).toBe(day(21));
  });

  it('다른 키는 포커스를 옮기지 않는다', () => {
    renderCalendar({ selected: new Date(2026, 9, 20) });
    day(20).focus();

    fireEvent.keyDown(day(20), { key: 'a' });

    expect(document.activeElement).toBe(day(20));
  });

  it('className은 합쳐진다', () => {
    const { container } = renderCalendar({ className: 'mt-2' });

    expect((container.firstElementChild as HTMLElement).className).toContain('mt-2');
  });
});

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatePickerField } from './DatePickerField';
import { parseDateInput } from './DatePickerField.internal';

afterEach(cleanup);

const NOV_25 = new Date(2026, 10, 25);

describe('parseDateInput', () => {
  it('점·하이픈·붙여 쓴 날짜와 표시 글자를 해석한다', () => {
    for (const text of [
      '2026.11.25',
      '2026-11-25',
      '2026 11 25',
      '20261125',
      '2026.11.25(수) 00:00',
    ]) {
      expect(parseDateInput(text)?.getTime()).toBe(NOV_25.getTime());
    }
  });

  it('형식이 아니거나 없는 날짜면 null이다', () => {
    expect(parseDateInput('내일')).toBeNull();
    expect(parseDateInput('2026.02.30')).toBeNull();
    expect(parseDateInput('2026.11.255')).toBeNull();
  });
});

describe('DatePickerField', () => {
  it('선택된 날짜를 표시 규칙대로 보여 준다', () => {
    render(
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={NOV_25}
        onValueChange={vi.fn()}
        formatValue={(date) => `${date.getMonth() + 1}월 ${date.getDate()}일 00:00`}
      />,
    );

    expect(screen.getByRole('combobox', { name: '시작일' })).toHaveProperty(
      'value',
      '11월 25일 00:00',
    );
  });

  it('입력칸을 누르면 달력이 열리고 날짜를 누르면 값을 알리고 닫는다', async () => {
    const onValueChange = vi.fn<(_date: Date | null) => void>();
    render(
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={null}
        onValueChange={onValueChange}
        placeholder="시작일 선택 또는 입력"
      />,
    );
    const input = screen.getByRole('combobox', { name: '시작일' });

    fireEvent.click(input);
    const dialog = await screen.findByRole('dialog', { name: '시작일 달력' });
    const firstDay = within(dialog).getAllByRole('gridcell')[0]?.querySelector('button');
    if (!firstDay) throw new Error('날짜 버튼 없음');
    fireEvent.click(firstDay);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[0]).toBeInstanceOf(Date);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    // 초점은 입력칸으로 돌아오고 달력은 다시 열리지 않음
    expect(document.activeElement).toBe(input);
  });

  it('직접 입력하고 Enter를 누르면 해석한 날짜를 알린다', () => {
    const onValueChange = vi.fn<(_date: Date | null) => void>();
    render(
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={null}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: '시작일' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2026-11-25' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onValueChange.mock.calls[0]?.[0]?.getTime()).toBe(NOV_25.getTime());
  });

  it('해석할 수 없거나 고를 수 없는 날을 입력하면 알리지 않고 이전 값으로 되돌린다', () => {
    const onValueChange = vi.fn<(_date: Date | null) => void>();
    render(
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={NOV_25}
        onValueChange={onValueChange}
        minDate={new Date(2026, 10, 20)}
      />,
    );
    const input = screen.getByRole('combobox', { name: '시작일' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2026.11.01' } });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveProperty('value', '2026.11.25');
  });

  it('입력을 모두 지우고 마치면 null을 알린다', () => {
    const onValueChange = vi.fn<(_date: Date | null) => void>();
    render(
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={NOV_25}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: '시작일' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it('되돌린 직접 입력은 스크린 리더에 알린다', async () => {
    render(
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={null}
        onValueChange={vi.fn()}
        invalidInputMessage="날짜를 2026.11.25 형식으로 입력해주세요"
      />,
    );
    const input = screen.getByRole('combobox', { name: '시작일' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '내일' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await vi.waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        '날짜를 2026.11.25 형식으로 입력해주세요',
      ),
    );
  });

  it('Esc는 입력 중인 글자를 버리고 이전 값을 유지한다', async () => {
    const onValueChange = vi.fn<(_date: Date | null) => void>();
    render(
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={NOV_25}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: '시작일' });

    fireEvent.click(input);
    await screen.findByRole('dialog', { name: '시작일 달력' });
    fireEvent.change(input, { target: { value: '2026.12.01' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveProperty('value', '2026.11.25');
  });

  it('↓ 키는 달력을 열고 날짜 격자로 초점을 옮긴다', async () => {
    render(
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={NOV_25}
        onValueChange={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox', { name: '시작일' });
    input.focus();
    fireEvent.keyDown(input, { key: 'Escape' });

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const dialog = await screen.findByRole('dialog', { name: '시작일 달력' });
    await vi.waitFor(() =>
      expect(within(dialog).getByRole('grid').contains(document.activeElement)).toBe(true),
    );
  });

  describe('Tab 이동', () => {
    const WithNext = () => (
      <>
        <DatePickerField
          aria-label="시작일"
          calendarLabel="시작일 달력"
          value={NOV_25}
          onValueChange={() => {}}
        />
        <button type="button">다음 칸</button>
      </>
    );

    it('입력칸에서 Tab을 누르면 달력을 닫고 다음 칸으로 간다', async () => {
      render(<WithNext />);
      const user = userEvent.setup();

      await user.click(screen.getByRole('combobox', { name: '시작일' }));
      expect(screen.queryByRole('dialog')).not.toBeNull();
      await user.tab();

      expect(document.activeElement).toBe(screen.getByRole('button', { name: '다음 칸' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('달력 안에서 Tab으로 끝을 지나면 닫고 다음 칸으로, Shift+Tab으로 처음을 지나면 입력칸으로 간다', async () => {
      render(<WithNext />);
      const user = userEvent.setup();
      const input = screen.getByRole('combobox', { name: '시작일' });

      await user.click(input);
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

      // 첫 요소(이전 달)까지 Shift+Tab, 한 번 더 누르면 입력칸
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(input);

      // 다시 격자로 들어가 Tab으로 끝을 지나면 다음 칸
      await user.keyboard('{ArrowDown}');
      await user.tab();

      expect(document.activeElement).toBe(screen.getByRole('button', { name: '다음 칸' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('다음 칸이 없으면 달력 안에서 Tab으로 끝을 지날 때 닫히고 다시 열리지 않는다', async () => {
      render(
        <DatePickerField
          aria-label="시작일"
          calendarLabel="시작일 달력"
          value={NOV_25}
          onValueChange={() => {}}
        />,
      );
      const user = userEvent.setup();

      await user.click(screen.getByRole('combobox', { name: '시작일' }));
      // 25일(말일 아님)이 격자의 Tab 대상
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement?.getAttribute('aria-label')).toContain('25일');
      await user.tab();

      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});

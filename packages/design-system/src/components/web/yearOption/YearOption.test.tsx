import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { YearOption } from './YearOption';

const Group = ({ onChange }: { onChange?: Mock }) => (
  <fieldset>
    <legend>출생연도</legend>
    {['2012', '2011', '2010'].map((year) => (
      <YearOption
        key={year}
        name="year"
        value={year}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
      >
        {year}
      </YearOption>
    ))}
  </fieldset>
);

describe('YearOption', () => {
  it('글자를 이름으로 가진 라디오로 렌더링하고 처음에는 선택되지 않는다', () => {
    render(<YearOption name="year">2012</YearOption>);

    const radio = screen.getByRole('radio', { name: '2012' });
    expect(radio).toHaveProperty('checked', false);
  });

  it('누르면 선택되고 같은 그룹의 다른 연도는 해제된다', async () => {
    const onChange = vi.fn();
    render(<Group onChange={onChange} />);

    await userEvent.click(screen.getByText('2012'));
    expect(screen.getByRole('radio', { name: '2012' })).toHaveProperty('checked', true);

    await userEvent.click(screen.getByText('2010'));
    expect(screen.getByRole('radio', { name: '2012' })).toHaveProperty('checked', false);
    expect(screen.getByRole('radio', { name: '2010' })).toHaveProperty('checked', true);
    expect(onChange.mock.calls).toEqual([['2012'], ['2010']]);
  });

  it('키보드 방향키로 같은 그룹의 연도를 옮길 수 있다', async () => {
    render(<Group />);

    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByRole('radio', { name: '2011' })).toHaveProperty('checked', true);
  });

  it('disabled면 선택할 수 없다', async () => {
    const onChange = vi.fn();
    render(
      <YearOption name="year" disabled onChange={onChange}>
        2012
      </YearOption>,
    );

    await userEvent.click(screen.getByText('2012'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radio')).toHaveProperty('disabled', true);
  });

  it('체크 아이콘은 화면 읽기에서 숨겨진다', () => {
    const { container } = render(<YearOption name="year">2012</YearOption>);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('className은 행 전체에, 나머지 props는 라디오에 적용된다', () => {
    render(
      <YearOption className="custom-row" name="year" value="2012" id="year-2012">
        2012
      </YearOption>,
    );

    const radio = screen.getByRole('radio');
    expect(radio.closest('label')?.className).toContain('custom-row');
    expect(radio).toHaveProperty('value', '2012');
    expect(radio).toHaveProperty('id', 'year-2012');
  });
});

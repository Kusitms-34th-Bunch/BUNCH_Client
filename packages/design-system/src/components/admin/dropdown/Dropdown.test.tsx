import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dropdown } from './Dropdown';

afterEach(cleanup);

const ITEMS = [
  { value: 'all', label: '전체' },
  { value: 'spam', label: '스팸' },
  { value: 'abuse', label: '괴롭힘・욕설' },
];

describe('Dropdown', () => {
  it('선택 전에는 안내 글자를, 선택 후에는 고른 항목을 트리거에 보여 준다', () => {
    const { rerender } = render(
      <Dropdown
        aria-label="신고 사유"
        items={ITEMS}
        value={null}
        onValueChange={vi.fn()}
        placeholder="신고 사유를 선택해주세요"
      />,
    );

    expect(screen.getByRole('combobox', { name: '신고 사유' }).textContent).toContain(
      '신고 사유를 선택해주세요',
    );

    rerender(
      <Dropdown aria-label="신고 사유" items={ITEMS} value="spam" onValueChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox', { name: '신고 사유' }).textContent).toContain('스팸');
  });

  it('열어서 항목을 누르면 값을 알린다', async () => {
    const onValueChange = vi.fn();
    render(
      <Dropdown aria-label="신고 사유" items={ITEMS} value="all" onValueChange={onValueChange} />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: '신고 사유' }));
    await user.click(await screen.findByRole('option', { name: '괴롭힘・욕설' }));

    expect(onValueChange).toHaveBeenCalledWith('abuse');
  });

  it('선택된 항목은 선택됨으로 알린다', async () => {
    render(<Dropdown aria-label="신고 사유" items={ITEMS} value="spam" onValueChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: '신고 사유' }));

    expect(
      (await screen.findByRole('option', { name: '스팸' })).getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('비활성이면 열 수 없다', () => {
    render(
      <Dropdown
        aria-label="신고 사유"
        items={ITEMS}
        value={null}
        onValueChange={vi.fn()}
        disabled
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: '신고 사유' }));

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('키보드로 열고 ↓·Enter로 고른다', async () => {
    const onValueChange = vi.fn();
    render(
      <Dropdown aria-label="신고 사유" items={ITEMS} value="all" onValueChange={onValueChange} />,
    );
    const user = userEvent.setup();

    screen.getByRole('combobox', { name: '신고 사유' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onValueChange).toHaveBeenCalledWith('spam');
  });
});

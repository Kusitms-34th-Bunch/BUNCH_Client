import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccountSwitcher } from './AccountSwitcher';

describe('AccountSwitcher', () => {
  it('계정 이름이 버튼의 접근성 이름이 된다', () => {
    render(<AccountSwitcher label="여행가조" />);

    expect(screen.getByRole('button', { name: '여행가조' })).toBeTruthy();
  });

  it('누르면 onClick을 호출하고 disabled면 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<AccountSwitcher label="여행가조" onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<AccountSwitcher label="여행가조" onClick={onClick} disabled />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('긴 계정 이름도 한 줄로 자른다', () => {
    render(<AccountSwitcher label="아주아주아주아주긴계정이름입니다" />);

    expect(screen.getByText('아주아주아주아주긴계정이름입니다').className).toContain('truncate');
  });
});

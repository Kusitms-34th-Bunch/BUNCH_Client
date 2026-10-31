import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FollowListItem } from './FollowListItem';

afterEach(cleanup);

describe('FollowListItem', () => {
  it('이름을 보여 주고 긴 이름은 title로 전체를 제공한다', () => {
    render(<FollowListItem name="야간러너스" />);

    expect(screen.getByText('야간러너스').getAttribute('title')).toBe('야간러너스');
  });

  it('비공개 계정을 자물쇠 아이콘만이 아니라 글자로도 전달한다', () => {
    const { container, rerender } = render(<FollowListItem name="야간러너스" isPrivate />);
    expect(screen.getByText('야간러너스').parentElement?.textContent).toBe(
      '야간러너스, 비공개 계정',
    );
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    rerender(<FollowListItem name="야간러너스" isPrivate privateLabel="" />);
    expect(screen.getByText(', 비공개 계정')).toBeTruthy();

    rerender(<FollowListItem name="야간러너스" />);
    expect(screen.queryByText(/비공개 계정/)).toBeNull();
  });

  it('보조 글자를 이름 아래에 보여 준다', () => {
    render(<FollowListItem name="야간러너스" meta="1일 전" />);

    expect(screen.getByText('1일 전')).toBeTruthy();
  });

  it('오른쪽 동작을 누를 수 있다', () => {
    const onApprove = vi.fn();
    render(
      <FollowListItem
        name="야간러너스"
        action={
          <button type="button" onClick={onApprove}>
            승인
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '승인' }));

    expect(onApprove).toHaveBeenCalledOnce();
  });
});

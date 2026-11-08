import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BundleParticipants } from './BundleParticipants';

const members = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버${index + 1}` }));

describe('BundleParticipants', () => {
  it('얼굴은 3개까지, 넘는 인원은 「외 N명」이고 이름은 전체 인원이다', async () => {
    const onClick = vi.fn();
    render(<BundleParticipants members={members(7)} onClick={onClick} />);

    const button = screen.getByRole('button', { name: '참여 멤버 7명, 외 4명' });
    expect(screen.getByText('외 4명')).toBeTruthy();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('3명 이하면 「외 N명」이 없고, 누를 수 없으면 버튼이 아니며, 0명이면 그리지 않는다', () => {
    const { rerender } = render(<BundleParticipants members={members(3)} />);
    expect(screen.queryByText(/외/)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('img', { name: '참여 멤버 3명' })).toBeTruthy();

    rerender(<BundleParticipants members={[]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

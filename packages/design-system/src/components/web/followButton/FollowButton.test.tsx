import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FollowButton } from './FollowButton';

afterEach(cleanup);

describe('FollowButton', () => {
  it('상태별 글자가 접근성 이름이다', () => {
    const { rerender } = render(<FollowButton status="follow" />);
    expect(screen.getByRole('button', { name: '팔로우' })).toBeTruthy();

    rerender(<FollowButton status="following" />);
    expect(screen.getByRole('button', { name: '팔로잉' })).toBeTruthy();

    rerender(<FollowButton status="requested" />);
    expect(screen.getByRole('button', { name: '팔로우 요청됨' })).toBeTruthy();
  });

  it('팔로잉에만 장식용 아래 화살표가 붙는다', () => {
    const { rerender } = render(<FollowButton status="following" />);
    expect(screen.getByRole('button').querySelector('[aria-hidden="true"] svg')).not.toBeNull();

    rerender(<FollowButton status="requested" />);
    expect(screen.getByRole('button').querySelector('svg')).toBeNull();
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<FollowButton status="follow" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '팔로우' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('글자를 바꿀 수 있다', () => {
    render(<FollowButton status="follow">맞팔로우</FollowButton>);

    expect(screen.getByRole('button', { name: '맞팔로우' })).toBeTruthy();
  });
});

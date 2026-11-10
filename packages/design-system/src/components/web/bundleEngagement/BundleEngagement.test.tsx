import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BundleEngagement } from './BundleEngagement';

describe('BundleEngagement', () => {
  it('하트·말풍선을 누르면 각각 알리고, 말풍선 콜백이 없으면 댓글 수는 글자다', async () => {
    const onLike = vi.fn();
    const onComment = vi.fn();
    const { rerender } = render(
      <BundleEngagement
        liked={false}
        likeCount={4}
        onLike={onLike}
        commentCount={2}
        onComment={onComment}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '좋아요 4' }));
    await userEvent.click(screen.getByRole('button', { name: '댓글 2' }));
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onComment).toHaveBeenCalledTimes(1);

    rerender(<BundleEngagement liked={false} likeCount={4} onLike={onLike} commentCount={2} />);
    expect(screen.queryByRole('button', { name: '댓글 2' })).toBeNull();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('members가 있을 때만 참여 멤버 버튼을 보인다', () => {
    const { rerender } = render(
      <BundleEngagement liked likeCount={1} onLike={vi.fn()} commentCount={0} />,
    );
    expect(screen.queryByRole('button', { name: /참여 멤버/ })).toBeNull();

    rerender(
      <BundleEngagement
        liked
        likeCount={1}
        onLike={vi.fn()}
        commentCount={0}
        members={[{ name: '수인' }]}
        onMembers={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '참여 멤버 1명' })).toBeTruthy();
  });
});

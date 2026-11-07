import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentItem } from './CommentItem';

const base = {
  author: '수인',
  bunchName: '퇴근런클럽',
  date: '2025.06.08',
  content: '와 정말 재미있겠어요.\n오늘 하루도 수고하셨습니다',
};

describe('CommentItem', () => {
  it('닉네임·번치 배지·날짜·본문(줄바꿈 유지)을 보여 준다', () => {
    render(<CommentItem {...base} />);

    expect(screen.getByText('수인')).toBeTruthy();
    expect(screen.getByText('퇴근런클럽')).toBeTruthy();
    expect(screen.getByText('2025.06.08')).toBeTruthy();
    const body = screen.getByText(/와 정말 재미있겠어요/);
    expect(body.textContent).toContain('\n');
    expect(body.className).toContain('whitespace-pre-line');
  });

  it('답글 버튼은 수가 있으면 「답글 N」, 없으면 「답글 달기」이고 누르면 알린다', async () => {
    const onReply = vi.fn();
    const { rerender } = render(<CommentItem {...base} replyCount={1} onReply={onReply} />);

    await userEvent.click(screen.getByRole('button', { name: '수인님 댓글의 답글 1개' }));
    expect(onReply).toHaveBeenCalledTimes(1);

    rerender(<CommentItem {...base} replyCount={0} onReply={onReply} />);
    expect(screen.getByRole('button', { name: '수인님 댓글에 답글 달기' })).toBeTruthy();
    expect(screen.getByText('답글 달기')).toBeTruthy();
  });

  it('답글에는 답글 버튼이 없고 화면 낭독용 「답글」 표시가 있다', () => {
    render(<CommentItem {...base} reply replyCount={3} onReply={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /답글/ })).toBeNull();
    expect(screen.getByText('답글').className).toContain('sr-only');
  });

  it('삭제된 댓글은 「작성자」·「삭제된 댓글입니다」만 보이고 배지·날짜·본문·답글 버튼을 숨긴다', () => {
    render(<CommentItem {...base} deleted replyCount={2} onReply={vi.fn()} />);

    expect(screen.getByText('작성자')).toBeTruthy();
    expect(screen.getByText('삭제된 댓글입니다')).toBeTruthy();
    expect(screen.queryByText('수인')).toBeNull();
    expect(screen.queryByText('퇴근런클럽')).toBeNull();
    expect(screen.queryByText('2025.06.08')).toBeNull();
    expect(screen.queryByText(/와 정말/)).toBeNull();
    expect(screen.queryByRole('button', { name: /답글/ })).toBeNull();
  });

  it('더보기는 작성자 이름이 들어간 버튼이고 누르면 알린다', async () => {
    const onMore = vi.fn();
    render(<CommentItem {...base} onMore={onMore} />);

    await userEvent.click(screen.getByRole('button', { name: '수인 댓글 더보기' }));
    expect(onMore).toHaveBeenCalledTimes(1);
  });
});

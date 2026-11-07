import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentComposer } from './CommentComposer';

const inputProps = {
  value: '',
  onValueChange: vi.fn(),
  onSubmit: vi.fn(),
  placeholder: '여행가조로 답글 달기',
};

describe('CommentComposer', () => {
  it('답글 대상이 없으면 입력칸만 보인다', () => {
    render(<CommentComposer {...inputProps} />);

    expect(screen.queryByText(/답글 남기는 중/)).toBeNull();
    expect(screen.getByRole('textbox', { name: '여행가조로 답글 달기' })).toBeTruthy();
  });

  it('답글 대상이 있으면 안내 줄과 닫기 버튼을 보이고 닫기를 알린다', async () => {
    const onCancelReply = vi.fn();
    render(<CommentComposer {...inputProps} replyTarget="수인" onCancelReply={onCancelReply} />);

    expect(screen.getByText('수인').parentElement?.textContent).toBe('수인님에게 답글 남기는 중');
    expect(
      screen.getByRole('textbox', { name: '수인님에게 답글, 여행가조로 답글 달기' }),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '답글 그만 쓰기' }));
    expect(onCancelReply).toHaveBeenCalledTimes(1);
  });
});

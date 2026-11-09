import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CommentInput } from './CommentInput';

const Controlled = ({ onSubmit }: { onSubmit: (_value: string) => void }) => {
  const [value, setValue] = useState('');
  return (
    <CommentInput
      value={value}
      onValueChange={setValue}
      onSubmit={onSubmit}
      placeholder="여행가조로 댓글 달기"
      maxLength={200}
    />
  );
};

describe('CommentInput', () => {
  it('안내 문구를 입력칸 이름으로 쓰고 비어 있으면 보내기가 비활성이다', () => {
    render(<Controlled onSubmit={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: '여행가조로 댓글 달기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '보내기' })).toHaveProperty('disabled', true);
  });

  it('공백만 입력하면 보내기가 비활성이다', async () => {
    render(<Controlled onSubmit={vi.fn()} />);

    await userEvent.type(screen.getByRole('textbox'), '   ');

    expect(screen.getByRole('button', { name: '보내기' })).toHaveProperty('disabled', true);
  });

  it('Enter는 줄바꿈이고 보내기 버튼을 눌러야 입력값으로 보낸다', async () => {
    const onSubmit = vi.fn();
    render(<Controlled onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox'), '안녕{Enter}하세요');
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '보내기' }));
    expect(onSubmit).toHaveBeenCalledWith('안녕\n하세요');
  });

  it('최대 글자 수를 입력칸에 넘긴다', () => {
    render(<Controlled onSubmit={vi.fn()} />);

    expect(screen.getByRole('textbox').getAttribute('maxlength')).toBe('200');
  });

  it('disabled면 입력과 보내기를 모두 막는다', () => {
    render(
      <CommentInput
        value="안녕"
        onValueChange={vi.fn()}
        onSubmit={vi.fn()}
        placeholder="댓글 달기"
        disabled
      />,
    );

    expect(screen.getByRole('textbox')).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: '보내기' })).toHaveProperty('disabled', true);
  });
});

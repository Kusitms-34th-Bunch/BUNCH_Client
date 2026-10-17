import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './TextField';

describe('TextField', () => {
  it('label이 입력창의 접근성 이름이고 안내 문구를 보여 준다', () => {
    render(<TextField label="제목" />);

    expect(screen.getByRole('textbox', { name: '제목' }).getAttribute('placeholder')).toBe(
      '글, 제목, 내용을 입력해주세요.',
    );
  });

  it('값이 있을 때만 지우기 버튼을 보이고 누르면 onClear를 호출한다', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const { rerender } = render(
      <TextField label="제목" value="" onChange={vi.fn()} onClear={onClear} />,
    );
    expect(screen.queryByRole('button', { name: '입력 지우기' })).toBeNull();

    rerender(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: '입력 지우기' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('지우기를 누르면 포커스가 입력창으로 돌아간다', async () => {
    const user = userEvent.setup();
    render(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '입력 지우기' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '제목' }));
  });

  it('readOnly면 지우기 버튼을 숨긴다', () => {
    render(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={vi.fn()} readOnly />);

    expect(screen.queryByRole('button', { name: '입력 지우기' })).toBeNull();
  });

  it('disabled면 입력창과 지우기 버튼을 쓸 수 없다', () => {
    render(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={vi.fn()} disabled />);

    expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: '입력 지우기' })).toBeNull();
  });

  it('action 영역을 입력창 뒤에 그린다', () => {
    render(<TextField label="제목" action={<button type="button">BUTTON</button>} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: 'BUTTON' });
    expect(input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './TextField';

const container = () => screen.getByRole('textbox').parentElement!.parentElement!;
// `focus-within:border-…`처럼 접두어가 붙은 클래스와 구분해 클래스 단위로 확인한다
const hasClass = (element: Element, name: string) => element.classList.contains(name);

describe('TextField', () => {
  it('label이 입력창의 접근성 이름이고 안내 문구를 보여 준다', () => {
    render(<TextField label="제목" />);

    expect(screen.getByRole('textbox', { name: '제목' }).getAttribute('placeholder')).toBe(
      '글, 제목, 내용을 입력해주세요.',
    );
  });

  it('기본 변형은 지우기 버튼이 없다', () => {
    render(<TextField label="제목" value="부산" onChange={vi.fn()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  describe('지우기 변형(onClear)', () => {
    it('값이 비어 있어도 지우기 버튼이 보이고 누르면 onClear를 호출한다', async () => {
      const user = userEvent.setup();
      const onClear = vi.fn();
      render(<TextField label="제목" value="" onChange={vi.fn()} onClear={onClear} />);

      await user.click(screen.getByRole('button', { name: '입력 지우기' }));

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('값이 있어도 지우기 버튼이 보인다', () => {
      render(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={vi.fn()} />);

      expect(screen.getByRole('button', { name: '입력 지우기' })).toBeTruthy();
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

    it('disabled면 지우기 버튼은 보이지만 누를 수 없다', () => {
      render(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={vi.fn()} disabled />);

      expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('button', { name: '입력 지우기' }).hasAttribute('disabled')).toBe(
        true,
      );
    });

    it('disabled면 값이 있어도 기본 테두리를 쓰고 지우기를 눌러도 onClear가 호출되지 않는다', async () => {
      const onClear = vi.fn();
      render(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={onClear} disabled />);

      expect(hasClass(container(), 'border-primitive-gray-700')).toBe(false);
      await userEvent.click(screen.getByRole('button', { name: '입력 지우기' }));
      expect(onClear).not.toHaveBeenCalled();
    });

    it('지우기 버튼에 마우스를 누르고 있는 동안에도 입력창의 포커스가 유지된다', async () => {
      render(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={vi.fn()} />);

      await userEvent.tab();
      await userEvent.pointer({
        keys: '[MouseLeft>]',
        target: screen.getByRole('button', { name: '입력 지우기' }),
      });

      expect(document.activeElement).toBe(screen.getByRole('textbox'));
      await userEvent.pointer({ keys: '[/MouseLeft]' });
    });

    it('값이 있거나 editing이면 포커스가 없어도 강한 테두리를 쓴다', () => {
      const { rerender } = render(
        <TextField label="제목" value="" onChange={vi.fn()} onClear={vi.fn()} />,
      );
      expect(hasClass(container(), 'border-primitive-gray-700')).toBe(false);

      rerender(<TextField label="제목" value="부산" onChange={vi.fn()} onClear={vi.fn()} />);
      expect(hasClass(container(), 'border-primitive-gray-700')).toBe(true);

      rerender(<TextField label="제목" value="" onChange={vi.fn()} onClear={vi.fn()} editing />);
      expect(hasClass(container(), 'border-primitive-gray-700')).toBe(true);
    });
  });

  it('기본 변형은 값이 있어도 포커스가 없으면 강한 테두리를 쓰지 않는다', () => {
    render(<TextField label="제목" value="부산" onChange={vi.fn()} />);

    expect(hasClass(container(), 'border-primitive-gray-700')).toBe(false);
  });

  it('action 영역을 입력창 뒤에 그린다', () => {
    render(<TextField label="제목" action={<button type="button">BUTTON</button>} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: 'BUTTON' });
    expect(input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('포커스되면 안내 문구를 숨기도록 스타일을 건다', () => {
    render(<TextField label="제목" />);

    expect(screen.getByRole('textbox').className).toContain('focus:placeholder:text-transparent');
  });

  it('disabled면 입력창 전체를 40% 투명하게 한다', () => {
    render(<TextField label="제목" disabled />);

    expect(container().className).toContain(
      'has-[input:disabled]:opacity-(--semantic-opacity-disabled)',
    );
    expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true);
  });

  describe('editing', () => {
    it('입력창 내용을 가리고 진행 중임을 알린다', () => {
      render(<TextField label="제목" value="부산" onChange={vi.fn()} editing />);

      const input = screen.getByRole('textbox', { name: '제목' });
      expect(input.className).toContain('opacity-0');
      expect(input.getAttribute('aria-busy')).toBe('true');
      expect((input as HTMLInputElement).value).toBe('부산');
    });

    it('점 3개 애니메이션을 보조 기술에는 숨겨서 그린다', () => {
      render(<TextField label="제목" editing />);

      const dots = screen
        .getByRole('textbox')
        .parentElement!.querySelector('[aria-hidden="true"]')!;
      expect(dots.children).toHaveLength(3);
    });

    it('editingLabel을 주면 editing 동안 그 문구를 상태 안내로 읽게 한다', () => {
      const { rerender } = render(<TextField label="제목" editing editingLabel="확인하는 중" />);
      expect(screen.getByRole('status').textContent).toBe('확인하는 중');

      rerender(<TextField label="제목" editingLabel="확인하는 중" />);
      expect(screen.getByRole('status').textContent).toBe('');
    });

    it('editingLabel이 없으면 상태 안내 영역을 그리지 않는다', () => {
      render(<TextField label="제목" editing />);

      expect(screen.queryByRole('status')).toBeNull();
    });

    it('editing이 아니면 점과 진행 표시가 없다', () => {
      render(<TextField label="제목" />);

      const input = screen.getByRole('textbox');
      expect(input.className).not.toContain('opacity-0');
      expect(input.getAttribute('aria-busy')).toBeNull();
      expect(input.parentElement!.querySelector('[aria-hidden="true"]')).toBeNull();
    });
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

const getBox = () => screen.getByRole<HTMLInputElement>('checkbox');

describe('Checkbox', () => {
  it('aria-label을 이름으로 가진 체크박스로 읽힌다', () => {
    render(<Checkbox aria-label="전체 선택" />);

    expect(screen.getByRole('checkbox', { name: '전체 선택' })).toBeTruthy();
  });

  it('눌러서 선택·해제하고 onChange를 부른다', async () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="전체 선택" onChange={onChange} />);

    await userEvent.click(getBox());
    expect(getBox().checked).toBe(true);
    await userEvent.click(getBox());

    expect(getBox().checked).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('연결된 label의 글자를 눌러도 선택된다', async () => {
    render(
      <>
        <Checkbox id="select-all" />
        <label htmlFor="select-all">사진 모두 선택</label>
      </>,
    );

    await userEvent.click(screen.getByText('사진 모두 선택'));

    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: '사진 모두 선택' }).checked).toBe(
      true,
    );
  });

  it('checked를 주면 호출하는 쪽 값을 따른다', async () => {
    render(<Checkbox aria-label="전체 선택" checked={false} onChange={() => {}} />);

    await userEvent.click(getBox());

    expect(getBox().checked).toBe(false);
  });

  it('키보드로 포커스를 받고 Space로 선택한다', async () => {
    render(<Checkbox aria-label="전체 선택" />);

    await userEvent.tab();
    expect(document.activeElement).toBe(getBox());
    await userEvent.keyboard(' ');

    expect(getBox().checked).toBe(true);
  });

  it('disabled이면 눌러도 바뀌지 않는다', async () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="전체 선택" disabled onChange={onChange} />);

    await userEvent.click(getBox());

    expect(getBox().checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('보이는 상자와 체크는 보조기기에서 숨기고 className은 바깥 래퍼에 적용한다', () => {
    const { container } = render(<Checkbox aria-label="전체 선택" className="ml-2" />);

    expect(container.firstElementChild?.classList.contains('ml-2')).toBe(true);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});

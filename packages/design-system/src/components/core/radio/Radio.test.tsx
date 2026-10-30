import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Radio } from './Radio';

describe('Radio', () => {
  it('aria-label을 이름으로 가진 라디오로 읽힌다', () => {
    render(<Radio aria-label="비공개" />);

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '비공개' })).toBeTruthy();
  });

  it('눌러서 선택하고 onChange를 부른다', async () => {
    const onChange = vi.fn();
    render(<Radio aria-label="비공개" onChange={onChange} />);

    await userEvent.click(screen.getByRole<HTMLInputElement>('radio', { name: '비공개' }));

    expect(screen.getByRole<HTMLInputElement>('radio').checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('defaultChecked로 처음부터 선택돼 있다', () => {
    render(<Radio aria-label="비공개" defaultChecked />);

    expect(screen.getByRole<HTMLInputElement>('radio').checked).toBe(true);
  });

  it('checked를 주면 호출하는 쪽 값을 따른다', async () => {
    render(<Radio aria-label="비공개" checked={false} onChange={() => {}} />);

    await userEvent.click(screen.getByRole<HTMLInputElement>('radio'));

    expect(screen.getByRole<HTMLInputElement>('radio').checked).toBe(false);
  });

  it('같은 name의 라디오는 하나만 선택된다', async () => {
    render(
      <>
        <Radio name="visibility" value="private" aria-label="비공개" />
        <Radio name="visibility" value="public" aria-label="공개" />
      </>,
    );
    const priv = screen.getByRole<HTMLInputElement>('radio', { name: '비공개' });
    const pub = screen.getByRole<HTMLInputElement>('radio', { name: '공개' });

    await userEvent.click(priv);
    await userEvent.click(pub);

    expect(priv.checked).toBe(false);
    expect(pub.checked).toBe(true);
  });

  it('키보드로 포커스를 받고 Space로 선택하며 같은 name 안에서 방향키로 이동한다', async () => {
    render(
      <>
        <Radio name="visibility" value="private" aria-label="비공개" />
        <Radio name="visibility" value="public" aria-label="공개" />
      </>,
    );
    const priv = screen.getByRole<HTMLInputElement>('radio', { name: '비공개' });
    const pub = screen.getByRole<HTMLInputElement>('radio', { name: '공개' });

    await userEvent.tab();
    expect(document.activeElement).toBe(priv);
    await userEvent.keyboard(' ');
    expect(priv.checked).toBe(true);
    await userEvent.keyboard('{ArrowDown}');

    expect(document.activeElement).toBe(pub);
    expect(pub.checked).toBe(true);
  });

  it('disabled이면 눌러도 선택되지 않는다', async () => {
    const onChange = vi.fn();
    render(<Radio aria-label="비공개" disabled onChange={onChange} />);

    await userEvent.click(screen.getByRole<HTMLInputElement>('radio'));

    expect(screen.getByRole<HTMLInputElement>('radio').checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('보이는 원은 보조기기에서 숨기고 className은 바깥 래퍼에 적용한다', () => {
    const { container } = render(<Radio aria-label="비공개" className="ml-2" />);

    expect(container.firstElementChild?.classList.contains('ml-2')).toBe(true);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

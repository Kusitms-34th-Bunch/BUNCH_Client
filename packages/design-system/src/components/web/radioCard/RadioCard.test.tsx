import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RadioCard } from './RadioCard';

describe('RadioCard', () => {
  it('카드 글자가 라디오의 이름이다', () => {
    render(<RadioCard name="visibility">비공개</RadioCard>);

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '비공개' })).toBeTruthy();
  });

  it('글자를 눌러도 선택되고 onChange를 부른다', async () => {
    const onChange = vi.fn();
    render(
      <RadioCard name="visibility" onChange={onChange}>
        비공개
      </RadioCard>,
    );

    await userEvent.click(screen.getByText('비공개'));

    expect(screen.getByRole<HTMLInputElement>('radio').checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('같은 name의 카드는 하나만 선택된다', async () => {
    render(
      <fieldset>
        <legend>공개 범위</legend>
        <RadioCard name="visibility" value="private" defaultChecked>
          비공개
        </RadioCard>
        <RadioCard name="visibility" value="public">
          전체 공개
        </RadioCard>
      </fieldset>,
    );

    await userEvent.click(screen.getByText('전체 공개'));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '비공개' }).checked).toBe(false);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '전체 공개' }).checked).toBe(true);
    expect(screen.getByRole('group', { name: '공개 범위' })).toBeTruthy();
  });

  it('카드 안 라디오는 자체 포커스 윤곽선을 끄고 카드가 그린다', () => {
    const { container } = render(<RadioCard name="visibility">비공개</RadioCard>);
    const radioWrapper = screen.getByRole('radio').parentElement;

    expect(radioWrapper?.classList.contains('has-focus-visible:outline-0')).toBe(true);
    expect(radioWrapper?.classList.contains('has-focus-visible:outline-2')).toBe(false);
    expect(container.firstElementChild?.classList.contains('has-focus-visible:outline-2')).toBe(
      true,
    );
  });

  it('className은 카드에 적용하고 나머지 속성은 라디오에 전달한다', () => {
    const { container } = render(
      <RadioCard className="mt-2" name="visibility" value="private">
        비공개
      </RadioCard>,
    );

    expect(container.firstElementChild?.tagName).toBe('LABEL');
    expect(container.firstElementChild?.classList.contains('mt-2')).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('radio').getAttribute('value')).toBe('private');
  });
});

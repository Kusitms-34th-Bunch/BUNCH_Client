import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RadioCard } from './RadioCard';

const PUBLIC = { title: '전체 공개', description: '번치의 모든 사용자가 볼 수 있어요' };
const MEMBERS = { title: '멤버 공개', description: '우리 번치 멤버만 볼 수 있어요' };

describe('RadioCard', () => {
  it('제목이 라디오의 이름이고 설명은 접근성 설명이다', () => {
    render(<RadioCard name="visibility" {...PUBLIC} />);

    expect(
      screen.getByRole('radio', { name: PUBLIC.title, description: PUBLIC.description }),
    ).toBeTruthy();
  });

  it('글자를 눌러도 선택되고 onChange를 부른다', async () => {
    const onChange = vi.fn();
    render(<RadioCard name="visibility" onChange={onChange} {...PUBLIC} />);

    await userEvent.click(screen.getByText(PUBLIC.description));

    expect(screen.getByRole<HTMLInputElement>('radio').checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('같은 name의 카드는 하나만 선택된다', async () => {
    render(
      <fieldset>
        <legend>공개 범위</legend>
        <RadioCard name="visibility" value="members" defaultChecked {...MEMBERS} />
        <RadioCard name="visibility" value="public" {...PUBLIC} />
      </fieldset>,
    );

    await userEvent.click(screen.getByText(PUBLIC.title));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: MEMBERS.title }).checked).toBe(
      false,
    );
    expect(screen.getByRole<HTMLInputElement>('radio', { name: PUBLIC.title }).checked).toBe(true);
    expect(screen.getByRole('group', { name: '공개 범위' })).toBeTruthy();
  });

  it('카드 안 라디오는 자체 포커스 윤곽선을 끄고 카드가 그린다', () => {
    const { container } = render(<RadioCard name="visibility" {...PUBLIC} />);
    const radioWrapper = screen.getByRole('radio').parentElement;

    expect(radioWrapper?.classList.contains('has-focus-visible:outline-0')).toBe(true);
    expect(radioWrapper?.classList.contains('has-focus-visible:outline-2')).toBe(false);
    expect(container.firstElementChild?.classList.contains('has-focus-visible:outline-2')).toBe(
      true,
    );
  });

  it('className은 카드에 적용하고 나머지 속성은 라디오에 전달한다', () => {
    const { container } = render(
      <RadioCard className="mt-2" name="visibility" value="public" {...PUBLIC} />,
    );

    expect(container.firstElementChild?.tagName).toBe('LABEL');
    expect(container.firstElementChild?.classList.contains('mt-2')).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('radio').getAttribute('value')).toBe('public');
  });
});

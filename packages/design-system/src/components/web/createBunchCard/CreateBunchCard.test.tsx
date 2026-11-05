import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CreateBunchCard } from './CreateBunchCard';

const icon = <svg data-testid="icon" />;
const props = {
  title: '새 번치 만들기',
  description: '친구들을 초대하고 함께한 순간을 기록해봐요',
  icon,
};

describe('CreateBunchCard', () => {
  it('제목과 설명을 이름으로 가진 버튼이다', () => {
    render(<CreateBunchCard {...props} />);

    const button = screen.getByRole('button', {
      name: '새 번치 만들기 친구들을 초대하고 함께한 순간을 기록해봐요',
    });
    expect(button.getAttribute('type')).toBe('button');
  });

  it('카드 어디를 눌러도 onClick이 한 번 호출된다', async () => {
    const onClick = vi.fn();
    render(<CreateBunchCard {...props} onClick={onClick} />);

    await userEvent.click(screen.getByText('친구들을 초대하고 함께한 순간을 기록해봐요'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Enter와 Space로 누를 수 있다', async () => {
    const onClick = vi.fn();
    render(<CreateBunchCard {...props} onClick={onClick} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('form 안에서 눌러도 제출하지 않는다', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <CreateBunchCard {...props} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('아이콘은 접근성에서 숨기고 className은 카드에 전달한다', () => {
    render(<CreateBunchCard {...props} className="custom" />);

    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByRole('button').className).toContain('custom');
  });

  it('ref는 button에 연결된다', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<CreateBunchCard {...props} ref={ref} />);

    expect(ref.current?.tagName).toBe('BUTTON');
  });
});

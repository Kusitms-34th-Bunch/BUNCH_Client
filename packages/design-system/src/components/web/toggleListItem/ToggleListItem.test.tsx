import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToggleListItem } from './ToggleListItem';

const TITLE = '앱 푸시 알림';
const DESCRIPTION = '푸시를 꺼도 앱 알림 목록에는 그대로 쌓여요.';

describe('ToggleListItem', () => {
  it('제목을 이름으로, 설명을 설명으로 가진 스위치로 읽힌다', () => {
    render(<ToggleListItem title={TITLE} description={DESCRIPTION} />);

    const toggle = screen.getByRole('switch', { name: TITLE });
    expect(
      document.getElementById(toggle.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe(DESCRIPTION);
  });

  it('설명이 없으면 설명을 연결하지 않는다', () => {
    render(<ToggleListItem title={TITLE} />);

    expect(screen.getByRole('switch', { name: TITLE }).hasAttribute('aria-describedby')).toBe(
      false,
    );
  });

  it('행의 글자를 눌러도 토글이 켜지고 onChange를 부른다', async () => {
    const onChange = vi.fn();
    render(<ToggleListItem title={TITLE} description={DESCRIPTION} onChange={onChange} />);

    await userEvent.click(screen.getByText(DESCRIPTION));

    expect(screen.getByRole<HTMLInputElement>('switch').checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('disabled이면 행을 눌러도 바뀌지 않는다', async () => {
    const onChange = vi.fn();
    render(<ToggleListItem title={TITLE} disabled onChange={onChange} />);

    await userEvent.click(screen.getByText(TITLE));

    expect(screen.getByRole<HTMLInputElement>('switch').checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('className은 행에 적용한다', () => {
    const { container } = render(<ToggleListItem title={TITLE} className="mt-2" />);

    expect(container.firstElementChild?.tagName).toBe('LABEL');
    expect(container.firstElementChild?.classList.contains('mt-2')).toBe(true);
  });
});

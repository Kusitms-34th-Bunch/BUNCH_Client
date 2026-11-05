import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

const getSwitch = () => screen.getByRole<HTMLInputElement>('switch');

describe('Toggle', () => {
  it('aria-label을 이름으로 가진 스위치로 읽힌다', () => {
    render(<Toggle aria-label="앱 푸시 알림" />);

    expect(screen.getByRole('switch', { name: '앱 푸시 알림' })).toBeTruthy();
  });

  it('눌러서 켜고 끄며 onChange를 부른다', async () => {
    const onChange = vi.fn();
    render(<Toggle aria-label="앱 푸시 알림" onChange={onChange} />);

    await userEvent.click(getSwitch());
    expect(getSwitch().checked).toBe(true);
    await userEvent.click(getSwitch());

    expect(getSwitch().checked).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('checked를 주면 호출하는 쪽 값을 따른다', async () => {
    render(<Toggle aria-label="앱 푸시 알림" checked onChange={() => {}} />);

    await userEvent.click(getSwitch());

    expect(getSwitch().checked).toBe(true);
  });

  it('키보드로 포커스를 받고 Space로 켠다', async () => {
    render(<Toggle aria-label="앱 푸시 알림" />);

    await userEvent.tab();
    expect(document.activeElement).toBe(getSwitch());
    await userEvent.keyboard(' ');

    expect(getSwitch().checked).toBe(true);
  });

  it('disabled이면 눌러도 바뀌지 않는다', async () => {
    const onChange = vi.fn();
    render(<Toggle aria-label="앱 푸시 알림" disabled defaultChecked onChange={onChange} />);

    await userEvent.click(getSwitch());

    expect(getSwitch().checked).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('노브는 켜질 때 오른쪽으로 미끄러지고, 동작 줄이기에서는 전환을 끈다', () => {
    const { container } = render(
      <Toggle aria-label="앱 푸시 알림" className="ml-2" style={{ marginTop: 4 }} />,
    );
    const knob = container.querySelectorAll('[aria-hidden="true"]')[1]?.className ?? '';

    expect(container.firstElementChild?.classList.contains('ml-2')).toBe(true);
    expect((container.firstElementChild as HTMLElement).style.marginTop).toBe('4px');
    expect(knob).toContain('peer-checked:translate-x-s12');
    expect(knob).toContain('motion-reduce:transition-none');
  });
});

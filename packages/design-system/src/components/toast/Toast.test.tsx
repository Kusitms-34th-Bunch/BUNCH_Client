import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from './showToast';
import { Toast } from './Toast';
import { Toaster } from './Toaster';

describe('Toast', () => {
  it('renders the message', () => {
    render(<Toast>저장했어요.</Toast>);

    expect(screen.getByText('저장했어요.')).toBeTruthy();
  });

  it('renders the success icon as decorative', () => {
    const { container } = render(<Toast icon="success">저장했어요.</Toast>);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('span[aria-hidden="true"] svg')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders no icon by default', () => {
    const { container } = render(<Toast>저장했어요.</Toast>);

    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders an action button that calls onClick', () => {
    const onClick = vi.fn();
    render(<Toast action={{ label: '공유', onClick }}>링크를 복사했어요.</Toast>);

    fireEvent.click(screen.getByRole('button', { name: '공유' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders no button without an action', () => {
    render(<Toast>저장했어요.</Toast>);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps className and native attributes', () => {
    render(
      <Toast className="custom" data-testid="toast">
        저장했어요.
      </Toast>,
    );

    expect(screen.getByTestId('toast').className).toContain('custom');
  });
});

// sonner는 토스트를 setTimeout으로 한 틱 늦게 반영하고 제거도 타이머로 예약한다. act 하나 안에서는 갱신이 모여 반영되므로 시간을 단계로 나눠 흘려 보낸다.
describe('toast()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  const show = async (...args: Parameters<typeof toast>) => {
    act(() => {
      toast(...args);
    });
    await advance(10);
  };

  it('shows the message in a polite live region named 알림', async () => {
    render(<Toaster />);

    await show('live region 확인');

    const region = screen.getByLabelText('알림');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-relevant')).toBe('additions text');
    expect(region.getAttribute('aria-atomic')).toBe('false');
    expect(within(region).getByText('live region 확인')).toBeTruthy();
  });

  it('puts the action button inside the live region and lets it take focus', async () => {
    render(<Toaster />);
    await show('버튼 접근', { action: { label: '공유', onClick: vi.fn() } });

    const button = within(screen.getByLabelText('알림')).getByRole('button', { name: '공유' });
    expect(button.getAttribute('tabindex')).not.toBe('-1');
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it('closes by itself after 3 seconds without an action', async () => {
    render(<Toaster />);
    await show('3초 뒤 닫힘');

    await advance(2500);
    expect(screen.queryByText('3초 뒤 닫힘')).toBeTruthy();

    await advance(1500);
    expect(screen.queryByText('3초 뒤 닫힘')).toBeNull();
  });

  it('keeps a toast with an action for 5 seconds', async () => {
    render(<Toaster />);
    await show('5초 뒤 닫힘', { action: { label: '공유', onClick: vi.fn() } });

    await advance(4500);
    expect(screen.queryByText('5초 뒤 닫힘')).toBeTruthy();

    await advance(1500);
    expect(screen.queryByText('5초 뒤 닫힘')).toBeNull();
  });

  it('never closes by itself with Infinity', async () => {
    render(<Toaster />);
    await show('계속 보임', { duration: Infinity });

    await advance(60_000);

    expect(screen.queryByText('계속 보임')).toBeTruthy();
  });

  it('calls the action and closes the toast', async () => {
    const onClick = vi.fn();
    render(<Toaster />);
    await show('액션 후 닫힘', { action: { label: '공유', onClick } });

    fireEvent.click(screen.getByRole('button', { name: '공유' }));
    await advance(50);
    await advance(500);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('액션 후 닫힘')).toBeNull();
  });

  it('replaces the previous toast with the new one', async () => {
    render(<Toaster />);
    await show('첫 번째');
    await show('두 번째');
    await advance(50);
    await advance(500);

    expect(screen.queryByText('첫 번째')).toBeNull();
    expect(screen.getByText('두 번째')).toBeTruthy();
  });

  it('restarts the display time when replaced', async () => {
    render(<Toaster />);
    await show('다시 센 첫 번째');
    await advance(2500);
    await show('다시 센 두 번째');

    await advance(2500);

    expect(screen.queryByText('다시 센 두 번째')).toBeTruthy();
  });
});

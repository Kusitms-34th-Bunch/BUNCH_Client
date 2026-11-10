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
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('24');
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
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

// sonner는 토스트를 setTimeout으로 한 틱 늦게 반영하고 제거도 타이머로 예약. act 하나 안에서는 갱신이 모여 반영되므로 시간을 단계로 나눠 진행
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

  it('closes a toast with an action after 5 seconds', async () => {
    render(<Toaster />);
    await show('액션 5초 뒤 닫힘', { action: { label: '공유', onClick: vi.fn() } });

    await advance(4500);
    expect(screen.queryByText('액션 5초 뒤 닫힘')).toBeTruthy();

    await advance(1500);
    expect(screen.queryByText('액션 5초 뒤 닫힘')).toBeNull();
  });

  it('lets duration override the default for a toast with an action', async () => {
    render(<Toaster />);
    await show('액션 2초 뒤 닫힘', {
      duration: 2000,
      action: { label: '공유', onClick: vi.fn() },
    });

    await advance(2500);

    expect(screen.queryByText('액션 2초 뒤 닫힘')).toBeNull();
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

  it('stretches the toast to the list width by default', async () => {
    render(<Toaster />);
    await show('위치 확인');

    const message = within(screen.getByLabelText('알림')).getByText('위치 확인');
    const toast = message.closest('div[class*="rounded-r6"]') as HTMLElement;
    expect(toast.className).toContain('w-full');
    expect(toast.className.split(' ')).not.toContain('mx-auto');
  });

  it('lets only the visible toast take touches, not the list', async () => {
    render(<Toaster />);
    await show('터치 확인');

    const message = within(screen.getByLabelText('알림')).getByText('터치 확인');
    const toast = message.closest('div[class*="rounded-r6"]') as HTMLElement;
    expect(toast.className).toContain('pointer-events-auto');
    // 목록 항목의 빈 자리는 터치를 통과시킴
    expect(toast.closest('li')?.className).toContain('pointer-events-none');
  });

  it('places the toast in the top list with position top', async () => {
    render(<Toaster />);
    await show('위쪽 토스트', { position: 'top' });

    const list = within(screen.getByLabelText('알림')).getByText('위쪽 토스트').closest('ol');
    expect(list?.getAttribute('data-y-position')).toBe('top');
  });

  it('keeps the toast centered at its content width with fullWidth false', async () => {
    render(<Toaster />);
    await show('내용 폭', { fullWidth: false });

    const message = within(screen.getByLabelText('알림')).getByText('내용 폭');
    const toast = message.closest('div[class*="rounded-r6"]') as HTMLElement;
    expect(toast.className).toContain('mx-auto');
    expect(toast.className.split(' ')).not.toContain('w-full');
  });

  describe('anchors', () => {
    const insetOf = () => document.documentElement.style.getPropertyValue('--toast-anchor-inset');

    // jsdom은 레이아웃이 없어 위 끝(top)과 크기를 직접 정함
    const addAnchor = (
      kind: string,
      top: number,
      { height = 60, inert = false }: { height?: number; inert?: boolean } = {},
    ) => {
      const element = document.createElement('div');
      element.dataset.toastAnchor = kind;
      element.inert = inert;
      element.getBoundingClientRect = () =>
        ({ top, width: 375, height, bottom: top + height }) as DOMRect;
      document.body.append(element);
      return element;
    };

    beforeEach(() => {
      vi.stubGlobal('innerHeight', 800);
    });

    afterEach(() => {
      for (const anchor of document.querySelectorAll('[data-toast-anchor]')) anchor.remove();
      document.documentElement.style.removeProperty('--toast-anchor-inset');
      vi.unstubAllGlobals();
    });

    it('puts the toast 4px above a bottom wrapper', async () => {
      addAnchor('wrapper', 720);
      render(<Toaster />);

      await show('wrapper 위');

      expect(insetOf()).toBe('84px');
    });

    it('puts the toast 16px above a bottom tab bar', async () => {
      addAnchor('tab-bar', 700);
      render(<Toaster />);

      await show('탭 막대 위');

      expect(insetOf()).toBe('116px');
    });

    it('follows the highest anchor when several are visible', async () => {
      addAnchor('wrapper', 720);
      addAnchor('tab-bar', 650);
      render(<Toaster />);

      await show('가장 높은 앵커');

      expect(insetOf()).toBe('166px');
    });

    it('ignores hidden anchors and screens leaving during a transition', async () => {
      addAnchor('wrapper', 720, { height: 0 });
      addAnchor('wrapper', 600, { inert: true });
      render(<Toaster />);

      await show('앵커 없음');

      expect(insetOf()).toBe('');
    });

    it('ignores anchors with an unknown kind', async () => {
      addAnchor('sidebar', 600);
      render(<Toaster />);

      await show('알 수 없는 앵커');

      expect(insetOf()).toBe('');
    });

    it('measures again on the next frame for screen changes made in the same action', async () => {
      render(<Toaster />);

      await show('프레임 뒤 앵커');
      expect(insetOf()).toBe('');

      // 같은 동작에서 탭 막대가 다시 나타남
      addAnchor('tab-bar', 700);
      await advance(20);

      expect(insetOf()).toBe('116px');
    });

    it('clears the previous inset when the next toast has no anchor', async () => {
      const anchor = addAnchor('wrapper', 720);
      render(<Toaster />);
      await show('앵커 있음');
      expect(insetOf()).toBe('84px');

      anchor.remove();
      await show('앵커 없음');

      expect(insetOf()).toBe('');
    });
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

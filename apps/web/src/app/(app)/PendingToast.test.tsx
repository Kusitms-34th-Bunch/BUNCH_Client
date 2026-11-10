import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markPageLoading } from '@/shared/lib/pageLoadingState';
import { settlePendingToast, toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { PendingToast } from './PendingToast';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@app/design-system', () => ({ toast }));

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const FRAME_MS = 16;

describe('PendingToast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] });
    pathname = '/';
    toast.mockClear();
  });

  afterEach(() => {
    cleanup();
    settlePendingToast(false);
    vi.useRealTimers();
  });

  const frames = (count: number) =>
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * count);
    });

  // 경로를 바꾸고 다시 그림(내비게이션 완료)
  const navigateTo = (path: string, view: ReturnType<typeof render>) => {
    pathname = path;
    view.rerender(<PendingToast />);
  };

  it('예약해도 경로가 바뀌기 전에는 띄우지 않는다', () => {
    render(<PendingToast />);

    act(() => toastAfterNavigation('저장했어요.'));
    frames(10);

    expect(toast).not.toHaveBeenCalled();
  });

  it('경로가 바뀌고 로딩·전환이 없으면 도착 화면에서 한 번 띄운다', () => {
    const view = render(<PendingToast />);
    act(() => toastAfterNavigation('저장했어요.', { icon: 'success' }));

    navigateTo('/next', view);
    frames(1);
    // 도착 화면의 로딩이 붙을 시간을 주려고 최소 프레임을 기다림
    expect(toast).not.toHaveBeenCalled();
    frames(2);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('저장했어요.', { icon: 'success' });

    frames(10);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('도착 화면의 전체 로딩이 끝난 뒤에 띄운다', () => {
    const view = render(<PendingToast />);
    const endLoading = markPageLoading();
    act(() => toastAfterNavigation('삭제했어요.'));

    navigateTo('/next', view);
    frames(10);
    expect(toast).not.toHaveBeenCalled();

    act(() => endLoading());
    frames(3);

    expect(toast).toHaveBeenCalledWith('삭제했어요.', undefined);
  });

  it('화면 전환 애니메이션이 끝난 뒤에 띄운다', () => {
    const leaving = document.createElement('div');
    leaving.dataset.pageLeaving = '';
    document.body.append(leaving);
    const view = render(<PendingToast />);
    act(() => toastAfterNavigation('나갔어요.'));

    navigateTo('/next', view);
    frames(10);
    expect(toast).not.toHaveBeenCalled();

    leaving.remove();
    frames(3);

    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('새 예약은 이전 예약을 대체한다', () => {
    const view = render(<PendingToast />);
    act(() => toastAfterNavigation('첫 번째'));
    act(() => toastAfterNavigation('두 번째'));

    navigateTo('/next', view);
    frames(3);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('두 번째', undefined);
  });

  it('경로가 끝내 바뀌지 않으면 만료 시각에 버리고 이후 이동에는 띄우지 않는다', () => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'Date',
        'setTimeout',
        'clearTimeout',
      ],
    });
    const view = render(<PendingToast />);
    act(() => toastAfterNavigation('오래된 안내'));

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    navigateTo('/later', view);
    frames(5);

    expect(toast).not.toHaveBeenCalled();
  });

  it('경로가 바뀐 뒤에는 로딩이 오래 걸려도 만료로 버리지 않는다', () => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'Date',
        'setTimeout',
        'clearTimeout',
      ],
    });
    const view = render(<PendingToast />);
    const endLoading = markPageLoading();
    act(() => toastAfterNavigation('느린 도착'));
    navigateTo('/next', view);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(toast).not.toHaveBeenCalled();

    act(() => endLoading());
    frames(3);

    expect(toast).toHaveBeenCalledWith('느린 도착', undefined);
  });

  it('전환 표식이 계속 남아도 최대 시간 뒤에는 띄운다', () => {
    const leaving = document.createElement('div');
    leaving.dataset.pageLeaving = '';
    document.body.append(leaving);
    const view = render(<PendingToast />);
    act(() => toastAfterNavigation('끝나지 않는 전환'));

    navigateTo('/next', view);
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(toast).toHaveBeenCalledTimes(1);
    leaving.remove();
  });
});

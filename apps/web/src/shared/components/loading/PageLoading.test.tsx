import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { getPageLoadingCount } from '@/shared/lib/pageLoadingState';
import { PageLoading } from './PageLoading';

// 로티 재생 라이브러리는 모양을 검증하지 않으므로 mock
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

// 덮개는 화면 틀 밖(body)에 그려 상태 바·홈 표시 영역까지 덮음
const overlayOf = () => document.body.querySelector<HTMLElement>('.bg-overlay-dim-subtle');

describe('PageLoading', () => {
  it('화면 전체를 dim으로 덮고 로딩 표시를 가운데에 하나만 보인다', async () => {
    const { container, findAllByTestId } = render(<PageLoading />);
    const overlay = overlayOf()!;

    // 화면 틀(전환 영역) 안이 아니라 body 바로 아래(안전 영역까지 덮도록)
    expect(container.contains(overlay)).toBe(false);
    expect(overlay.parentElement).toBe(document.body);

    expect(overlay.className).toContain('bg-overlay-dim-subtle');
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('inset-0');
    expect(overlay.className).toContain('items-center');
    expect(overlay.className).toContain('justify-center');
    expect(await findAllByTestId('lottie')).toHaveLength(1);
  });

  it('보이는 동안만 전체 로딩 중임을 알린다', () => {
    const before = getPageLoadingCount();
    const { rerender } = render(<PageLoading />);
    expect(getPageLoadingCount()).toBe(before + 1);

    rerender(<></>);
    expect(getPageLoadingCount()).toBe(before);
  });

  it('장식이라 접근성 트리에서는 숨기고 상태 안내는 호출하는 쪽에 맡긴다', () => {
    const { container } = render(<PageLoading />);

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(overlayOf()!.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('보이는 동안 초점을 덮개로 옮기고 Tab으로 뒤 화면에 닿지 않게 한 뒤, 끝나면 원래 자리로 되돌린다', async () => {
    const { container, rerender } = render(
      <>
        <button type="button">뒤 화면 버튼</button>
        <PageLoading />
      </>,
    );
    const button = container.querySelector('button') as HTMLButtonElement;
    const overlay = overlayOf()!;
    expect(document.activeElement).toBe(overlay);

    await userEvent.tab();
    expect(document.activeElement).toBe(overlay);

    button.focus();
    rerender(
      <>
        <button type="button">뒤 화면 버튼</button>
      </>,
    );
    expect(document.activeElement).toBe(button);
  });

  it('서버에서 그려진 덮개가 하이드레이션 뒤 body로 옮겨져도 초점은 새 덮개에 있다', async () => {
    const { hydrateRoot } = await import('react-dom/client');
    const { renderToString } = await import('react-dom/server');
    const host = document.createElement('div');
    document.body.append(host);
    host.innerHTML = renderToString(<PageLoading />);

    const root = await act(() => hydrateRoot(host, <PageLoading />));
    const overlay = overlayOf()!;
    expect(overlay.parentElement).toBe(document.body);
    expect(document.activeElement).toBe(overlay);

    act(() => root.unmount());
    host.remove();
  });

  it('delayMs를 주면 그 시간이 지나야 덮고, 그 전에 끝나면 덮지 않는다', async () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    const before = getPageLoadingCount();
    const { unmount } = render(<PageLoading delayMs={1000} />);

    await act(() => vi.advanceTimersByTimeAsync(999));
    expect(overlayOf()).toBeNull();
    // 덮개는 늦어도 로딩 중임은 붙는 순간부터 알림(앱 스플래시·화면 이동 뒤 토스트가 기다림)
    expect(getPageLoadingCount()).toBe(before + 1);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(overlayOf()).not.toBeNull();
    expect(getPageLoadingCount()).toBe(before + 1);

    unmount();
    const early = render(<PageLoading delayMs={1000} />);
    early.unmount();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(getPageLoadingCount()).toBe(before);
  });

  it('label을 주면 덮개가 뜨기 전에도 상태 안내를 바로 그린다', () => {
    const { getByRole } = render(<PageLoading delayMs={1000} label="화면을 불러오는 중이에요" />);

    expect(getByRole('status').textContent).toBe('화면을 불러오는 중이에요');
  });
});

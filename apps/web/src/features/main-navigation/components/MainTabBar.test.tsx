import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainTabBar } from './MainTabBar';

vi.mock('next/navigation', () => ({ usePathname: () => '/feed' }));

describe('MainTabBar', () => {
  it('웹 막대 영역을 토스트 앵커(tab-bar)로 표시한다', () => {
    const { container } = render(<MainTabBar />);

    const bar = container.querySelector('[data-main-tab-bar]');
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute('data-toast-anchor', 'tab-bar');
  });

  it('지금 탭의 첫 화면에서 그 탭을 다시 누르면 이동하지 않고 화면을 맨 위로 올린다', () => {
    const { container } = render(
      <>
        <main data-testid="page" />
        <MainTabBar />
      </>,
    );
    const page = screen.getByTestId('page');
    const scrollTo = vi.fn();
    page.scrollTo = scrollTo;
    const feed = container.querySelector<HTMLAnchorElement>('a[aria-current="page"]')!;

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(feed, click);
    expect(click.defaultPrevented).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});

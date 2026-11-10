import { render } from '@testing-library/react';
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
});

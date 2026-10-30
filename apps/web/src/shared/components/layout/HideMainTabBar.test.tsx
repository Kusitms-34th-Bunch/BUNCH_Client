import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HideMainTabBar } from './HideMainTabBar';

describe('HideMainTabBar', () => {
  it('화면에는 보이지 않는 표식 요소만 렌더한다', () => {
    const { container } = render(<HideMainTabBar />);
    const marker = container.querySelector('[data-hide-main-tab-bar]');

    expect(marker).not.toBeNull();
    expect((marker as HTMLElement).hidden).toBe(true);
    expect(marker?.textContent).toBe('');
  });
});

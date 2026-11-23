import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCurrentYear } from '@/shared/hooks/useCurrentYear';

function Year() {
  return <span>{String(useCurrentYear())}</span>;
}

describe('useCurrentYear', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('서버 렌더에서는 연도를 모름(null)으로 둔다', () => {
    expect(renderToString(<Year />)).toContain('null');
  });

  it('브라우저에서는 올해를 주고, 화면이 다시 보일 때 해가 바뀌었으면 따라간다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59));
    render(<Year />);
    expect(screen.getByText('2026')).toBeInTheDocument();

    vi.setSystemTime(new Date(2027, 0, 1, 0, 1));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByText('2027')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BundleCaption } from './BundleCaption';

// jsdom은 줄 수를 계산하지 않아 넘침 여부를 높이로 흉내 냄
const mockOverflow = (overflowing: boolean) => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(overflowing ? 84 : 42);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(42);
};

describe('BundleCaption', () => {
  afterEach(() => vi.restoreAllMocks());

  it('2줄을 넘으면 「..더보기」로 펼치고, 내용이 바뀌면 다시 접는다', async () => {
    mockOverflow(true);
    const { rerender } = render(<BundleCaption content="첫 사진 캡션" />);
    const text = screen.getByText('첫 사진 캡션');

    expect(text.className).toContain('line-clamp-2');
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(text.className).not.toContain('line-clamp-2');
    expect(screen.queryByRole('button', { name: '더보기' })).toBeNull();
    // 버튼이 사라져도 초점은 펼친 본문으로
    expect(document.activeElement).toBe(text);

    rerender(<BundleCaption content="둘째 사진 캡션" />);
    expect(screen.getByText('둘째 사진 캡션').className).toContain('line-clamp-2');
    expect(screen.getByRole('button', { name: '더보기' })).toBeTruthy();
  });

  it('2줄 이하면 더보기가 없다', () => {
    mockOverflow(false);
    render(<BundleCaption content="짧은 캡션" />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageLoading } from './PageLoading';

// 로티 재생 라이브러리는 모양을 검증하지 않으므로 mock
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

describe('PageLoading', () => {
  it('화면 전체를 dim으로 덮고 로딩 표시를 가운데에 하나만 보인다', async () => {
    const { container, findAllByTestId } = render(<PageLoading />);
    const overlay = container.firstElementChild as HTMLElement;

    expect(overlay.className).toContain('bg-overlay-dim-subtle');
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('inset-0');
    expect(overlay.className).toContain('items-center');
    expect(overlay.className).toContain('justify-center');
    expect(await findAllByTestId('lottie')).toHaveLength(1);
  });

  it('장식이라 접근성 트리에서는 숨기고 상태 안내는 호출하는 쪽에 맡긴다', () => {
    const { container } = render(<PageLoading />);

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('보이는 동안 초점을 덮개로 옮기고 Tab으로 뒤 화면에 닿지 않게 한 뒤, 끝나면 원래 자리로 되돌린다', async () => {
    const { container, rerender } = render(
      <>
        <button type="button">뒤 화면 버튼</button>
        <PageLoading />
      </>,
    );
    const button = container.querySelector('button') as HTMLButtonElement;
    const overlay = container.querySelector('[tabindex="-1"]') as HTMLElement;
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
});

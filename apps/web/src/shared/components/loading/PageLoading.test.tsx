import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageLoading } from './PageLoading';

// 로티 재생 라이브러리는 모양을 검증하지 않으므로 mock
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

describe('PageLoading', () => {
  it('화면 전체를 dim으로 덮고 로딩 점을 가운데에 하나만 보인다', async () => {
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
});

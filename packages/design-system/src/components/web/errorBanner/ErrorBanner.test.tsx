import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner', () => {
  it('문구를 alert 영역으로 보여 준다', () => {
    render(<ErrorBanner>연결이 끊겼어요.</ErrorBanner>);

    expect(screen.getByRole('alert').textContent).toBe('연결이 끊겼어요.');
  });

  it('기본 아이콘은 장식으로 숨겨진다', () => {
    const { container } = render(<ErrorBanner>연결이 끊겼어요.</ErrorBanner>);
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('width')).toBe('20');
  });

  it('icon에 null을 주면 아이콘을 그리지 않고 다른 노드를 주면 대신 그린다', () => {
    const { container, rerender } = render(<ErrorBanner icon={null}>문구</ErrorBanner>);

    expect(container.querySelector('svg')).toBeNull();

    rerender(<ErrorBanner icon={<span data-testid="custom" />}>문구</ErrorBanner>);

    expect(screen.getByTestId('custom')).toBeTruthy();
  });

  it('actionLabel이 없거나 빈 문자열이면 버튼이 없다', () => {
    const { rerender } = render(<ErrorBanner>문구</ErrorBanner>);

    expect(screen.queryByRole('button')).toBeNull();

    rerender(<ErrorBanner actionLabel="">문구</ErrorBanner>);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('icon으로 넘긴 노드도 스크린 리더에서 숨겨진다', () => {
    render(<ErrorBanner icon={<span data-testid="custom" />}>문구</ErrorBanner>);

    expect(screen.getByTestId('custom').parentElement?.getAttribute('aria-hidden')).toBe('true');
  });

  it('actionLabel을 주면 버튼이 생기고 누르면 onActionClick이 호출된다', () => {
    const onActionClick = vi.fn();
    render(
      <ErrorBanner actionLabel="재시도" onActionClick={onActionClick}>
        문구
      </ErrorBanner>,
    );
    const button = screen.getByRole('button', { name: '재시도' });

    expect(button.getAttribute('type')).toBe('button');

    fireEvent.click(button);

    expect(onActionClick).toHaveBeenCalledTimes(1);
  });

  it('className은 합쳐지고 role은 바꿀 수 있다', () => {
    render(
      <ErrorBanner className="mt-2" role="status">
        문구
      </ErrorBanner>,
    );
    const banner = screen.getByRole('status');

    expect(banner.className).toContain('mt-2');
    expect(banner.className).toContain('bg-system-fail-text');
  });
});

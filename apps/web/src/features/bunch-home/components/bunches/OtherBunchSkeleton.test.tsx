import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OtherBunchSkeleton } from './OtherBunchSkeleton';

describe('OtherBunchSkeleton', () => {
  it('상태 영역을 비운 채 먼저 두고, 마운트 뒤에 받는 중 문구를 채운다', async () => {
    render(<OtherBunchSkeleton onBack={vi.fn()} />);

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    await waitFor(() => expect(status.textContent).toBe('번치를 불러오는 중이에요'));
  });

  it('받는 중에도 뒤로 가기는 누를 수 있고 번치 제목은 두지 않는다', () => {
    const onBack = vi.fn();
    render(<OtherBunchSkeleton onBack={onBack} />);

    screen.getByRole('button', { name: '뒤로 가기' }).click();
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

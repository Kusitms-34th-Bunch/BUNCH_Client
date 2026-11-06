import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BunchLeavePage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  BunchLeave: () => <div data-testid="bunch-leave" />,
}));

describe('/bunch/menu/leave page', () => {
  it('전환 경계(data-ssgoi-transition)를 나가기 경로로 지정한다', () => {
    expect(BunchLeavePage().props).toMatchObject({ 'data-ssgoi-transition': '/bunch/menu/leave' });
  });

  it('나가기 화면을 그린다', () => {
    render(<BunchLeavePage />);

    expect(screen.getByTestId('bunch-leave')).toBeInTheDocument();
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});

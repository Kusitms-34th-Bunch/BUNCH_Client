import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BunchBlockedListPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  BunchBlockedList: () => <div data-testid="blocked-list" />,
}));

describe('/bunch/menu/blocked page', () => {
  it('전환 경계(data-ssgoi-transition)를 차단 목록 경로로 지정한다', () => {
    expect(BunchBlockedListPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/menu/blocked',
    });
  });

  it('차단 목록 화면을 그린다', () => {
    render(<BunchBlockedListPage />);

    expect(screen.getByTestId('blocked-list')).toBeInTheDocument();
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});

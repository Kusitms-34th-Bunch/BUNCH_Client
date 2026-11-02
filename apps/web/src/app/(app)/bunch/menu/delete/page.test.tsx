import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BunchDeletePage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  BunchDelete: () => <div data-testid="bunch-delete" />,
}));

describe('/bunch/menu/delete page', () => {
  it('전환 경계(data-ssgoi-transition)를 삭제 안내 경로로 지정한다', () => {
    expect(BunchDeletePage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/menu/delete',
    });
  });

  it('삭제 안내 화면을 그린다', () => {
    render(<BunchDeletePage />);

    expect(screen.getByTestId('bunch-delete')).toBeInTheDocument();
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});

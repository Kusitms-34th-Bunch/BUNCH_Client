import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BunchDeleteConfirmPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  BunchDelete: () => <div data-testid="bunch-delete" />,
}));

describe('/bunch/menu/delete/confirm page', () => {
  it('전환 경계(data-ssgoi-transition)를 확인 경로로 지정한다', () => {
    expect(BunchDeleteConfirmPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/menu/delete/confirm',
    });
  });

  it('확인 화면을 그린다', () => {
    render(<BunchDeleteConfirmPage />);

    expect(screen.getByTestId('bunch-delete')).toBeInTheDocument();
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});

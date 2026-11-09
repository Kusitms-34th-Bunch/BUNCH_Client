import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompletedBundleGrid } from './CompletedBundleGrid';

describe('CompletedBundleGrid', () => {
  it('멤버 공개 번들만 아이콘을 얹고 대체 텍스트로 알린다', () => {
    const { container } = render(
      <CompletedBundleGrid
        bundles={[
          { id: 'a', title: '공개 번들', coverSrc: '/a.jpg', memberOnly: false },
          { id: 'b', title: '우리끼리', coverSrc: '/b.jpg', memberOnly: true },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: '공개 번들' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '우리끼리, 멤버 공개' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });
});

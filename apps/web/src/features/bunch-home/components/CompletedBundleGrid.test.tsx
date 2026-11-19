import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedBundleGrid } from './CompletedBundleGrid';

const bundles = [
  { id: 'a', title: '공개 번들', coverSrc: '/a.jpg', memberOnly: false },
  { id: 'b', title: '우리끼리', coverSrc: '/b.jpg', memberOnly: true },
];

describe('CompletedBundleGrid', () => {
  it('멤버 공개 번들만 아이콘을 얹고 대체 텍스트로 알린다', () => {
    const { container } = render(<CompletedBundleGrid bunchId="1" bundles={bundles} />);

    expect(screen.getByRole('img', { name: '공개 번들' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '우리끼리, 멤버 공개' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('칸은 번들 제목을 이름으로 하는 번들 상세 링크이고, 누르면 그 번들을 넘긴다', async () => {
    const onOpen = vi.fn();
    render(<CompletedBundleGrid bunchId="1" bundles={bundles} onOpen={onOpen} />);

    const link = screen.getByRole('link', { name: '공개 번들' });
    expect(link).toHaveAttribute('href', '/bunches/1/bundles/a');
    await userEvent.click(link);
    expect(onOpen).toHaveBeenCalledWith('a');
  });
});

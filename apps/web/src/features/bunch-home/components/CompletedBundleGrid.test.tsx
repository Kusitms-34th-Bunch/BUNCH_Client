import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompletedBundleGrid } from './CompletedBundleGrid';

const bundles = [
  { id: 'a', title: '공개 번들', coverSrc: '/a.jpg', memberOnly: false },
  { id: 'b', title: '우리끼리', coverSrc: '/b.jpg', memberOnly: true },
];

describe('CompletedBundleGrid', () => {
  it('첫 화면의 12칸은 사진을 바로 받고 그 아래 칸은 다가올 때 받는다(#534)', () => {
    const many = Array.from({ length: 14 }, (_, index) => ({
      ...bundles[0]!,
      id: `m${index}`,
      coverSrc: `/c${index}.jpg`,
    }));
    const { container } = render(<CompletedBundleGrid bunchId="1" bundles={many} />);
    const loading = [...container.querySelectorAll('img')].map((img) =>
      img.getAttribute('loading'),
    );
    expect(loading.slice(0, 12)).toEqual(Array(12).fill(null));
    expect(loading.slice(12)).toEqual(['lazy', 'lazy']);
  });

  it('아래 칸이라도 한 번 받은 사진은 다시 그릴 때 바로 받는다(상세에서 돌아오는 전환)', () => {
    const many = Array.from({ length: 14 }, (_, index) => ({
      ...bundles[0]!,
      id: `s${index}`,
      coverSrc: `/seen${index}.jpg`,
    }));
    const { container, unmount } = render(<CompletedBundleGrid bunchId="1" bundles={many} />);
    const last = [...container.querySelectorAll('img')].at(-1)!;
    expect(last.getAttribute('loading')).toBe('lazy');
    expect(last.getAttribute('decoding')).toBe('async');
    fireEvent.load(last);
    unmount();

    const again = render(<CompletedBundleGrid bunchId="1" bundles={many} />);
    const seen = [...again.container.querySelectorAll('img')].at(-1)!;
    expect(seen.getAttribute('loading')).toBeNull();
    // 돌아오는 전환 첫 프레임에 비지 않게 동기 decode(#573)
    expect(seen.getAttribute('decoding')).toBeNull();
  });

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

  it('사진은 다 받기 전에는 숨겨 회색 칸을 보이고, 받으면 나타난다', () => {
    render(<CompletedBundleGrid bunchId="1" bundles={bundles} />);
    const image = screen.getByRole('img', { name: '공개 번들' });

    expect(image).not.toHaveAttribute('data-loaded');
    fireEvent.load(image);
    expect(image).toHaveAttribute('data-loaded');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotFound, { metadata } from './not-found';

// next/font는 빌드 단계에서만 동작해 테스트에서는 글꼴 이름만 돌려줌
vi.mock('next/font/local', () => ({ default: () => ({ style: { fontFamily: 'pretendard' } }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/bunches/unknown' }));

describe('not-found', () => {
  it('찾을 수 없다고 알리고 번치 탭으로 돌아가는 길을 둔다', () => {
    render(<NotFound />);

    expect(
      screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없어요' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '번치 탭으로 가기' })).toHaveAttribute(
      'href',
      '/bunch',
    );
    expect(metadata.robots).toEqual({ index: false });
  });
});

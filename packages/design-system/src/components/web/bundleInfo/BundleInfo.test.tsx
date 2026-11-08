import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BundleInfo } from './BundleInfo';

describe('BundleInfo', () => {
  it('제목은 제목 요소이고 위치는 누를 수 있다', async () => {
    const onLocationClick = vi.fn();
    render(
      <BundleInfo
        title="제주 여행"
        location="애월읍 외 1곳"
        onLocationClick={onLocationClick}
        date="2026년 7월 9일"
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: '제주 여행' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '위치 애월읍 외 1곳' }));
    expect(onLocationClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('2026년 7월 9일')).toBeTruthy();
  });

  it('위치·날짜가 없으면 줄을 숨긴다', () => {
    render(<BundleInfo title="제주 여행" titleAs="h3" />);

    expect(screen.getByRole('heading', { level: 3 })).toBeTruthy();
    expect(screen.queryByText(/위치/)).toBeNull();
    expect(screen.queryByText(/날짜/)).toBeNull();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileImage } from './ProfileImage';

describe('ProfileImage', () => {
  it('src가 있으면 이미지를 그리고 alt를 이름으로 준다', () => {
    render(<ProfileImage src="/me.png" alt="내 프로필 사진" />);

    expect(screen.getByRole('img', { name: '내 프로필 사진' }).getAttribute('src')).toBe('/me.png');
  });

  it('alt를 비우면 이미지는 장식으로 숨겨진다', () => {
    const { container } = render(<ProfileImage src="/me.png" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('src가 없으면 이미지 없이 배경 원만 그린다', () => {
    const { container } = render(<ProfileImage />);

    expect(container.querySelector('img')).toBeNull();
  });

  it('src가 바뀌면 바뀐 이미지를 그린다', () => {
    const { rerender } = render(<ProfileImage src="/default.png" alt="기본 프로필 사진" />);
    expect(screen.getByRole('img').getAttribute('src')).toBe('/default.png');

    rerender(<ProfileImage src="/picked.png" alt="선택한 프로필 사진" />);
    expect(screen.getByRole('img', { name: '선택한 프로필 사진' }).getAttribute('src')).toBe(
      '/picked.png',
    );
  });
});

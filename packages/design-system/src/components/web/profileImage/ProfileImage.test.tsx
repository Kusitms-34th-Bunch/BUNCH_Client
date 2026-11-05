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

  it('size를 안 주면 90px, 주면 크기별 지름이다', () => {
    const sizes = { L: 'size-22.5', M: 'size-16', S: 'size-10', XS: 'size-8.5', XXS: 'size-6' };
    const { container, rerender } = render(<ProfileImage />);
    expect((container.firstElementChild as HTMLElement).classList.contains('size-22.5')).toBe(true);

    for (const [size, className] of Object.entries(sizes)) {
      rerender(<ProfileImage size={size as keyof typeof sizes} />);
      const { classList } = container.firstElementChild as HTMLElement;

      expect(classList.contains(className)).toBe(true);
      expect(Object.values(sizes).filter((value) => classList.contains(value))).toEqual([
        className,
      ]);
    }
  });

  it('className으로 지름을 덮어쓸 수 있다', () => {
    const { container } = render(<ProfileImage size="S" className="size-7.75" />);
    const { classList } = container.firstElementChild as HTMLElement;

    expect(classList.contains('size-7.75')).toBe(true);
    expect(classList.contains('size-10')).toBe(false);
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

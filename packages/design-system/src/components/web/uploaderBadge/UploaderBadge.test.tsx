import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UploaderBadge } from './UploaderBadge';

describe('UploaderBadge', () => {
  it('이름을 글자로 보여 준다', () => {
    render(<UploaderBadge name="경진" />);

    expect(screen.getByText('경진')).toBeTruthy();
  });

  it('프로필 사진은 장식 이미지로 그린다', () => {
    const { container } = render(<UploaderBadge name="경진" avatarSrc="/avatar.png" />);
    const image = container.querySelector('img');

    expect(image?.getAttribute('src')).toBe('/avatar.png');
    expect(image?.getAttribute('alt')).toBe('');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('avatarSrc가 없으면 사진 없이 배경색 원만 그린다', () => {
    const { container } = render(<UploaderBadge name="경진" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('경진')).toBeTruthy();
  });

  it('className을 병합하고 나머지 span 속성을 전달한다', () => {
    render(<UploaderBadge name="경진" className="absolute top-2 left-2" data-testid="badge" />);

    const badge = screen.getByTestId('badge');
    expect(badge.classList.contains('absolute')).toBe(true);
    expect(badge.classList.contains('inline-flex')).toBe(true);
    expect(badge.tagName).toBe('SPAN');
  });
});

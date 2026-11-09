import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BundlePickPhoto } from './BundlePickPhoto';

describe('BundlePickPhoto', () => {
  it('사진과 설명을 보여 준다', () => {
    render(<BundlePickPhoto src="/photo.jpg" alt="한강에서 달리는 사람들" />);

    const image = screen.getByRole('img', { name: '한강에서 달리는 사람들' });
    expect(image.getAttribute('src')).toBe('/photo.jpg');
    expect(image.classList.contains('object-cover')).toBe(true);
  });

  it('틀은 295×396(w-73.75·h-99)에 반경 r3로 넘치는 부분을 자른다', () => {
    const { container } = render(<BundlePickPhoto src="/photo.jpg" alt="" />);
    const frame = container.firstElementChild as HTMLElement;

    expect(frame.classList.contains('w-73.75')).toBe(true);
    expect(frame.classList.contains('h-99')).toBe(true);
    expect(frame.classList.contains('rounded-r3')).toBe(true);
    expect(frame.classList.contains('overflow-clip')).toBe(true);
  });

  it('className은 틀에 적용되고 div 속성을 받는다', () => {
    const { container } = render(
      <BundlePickPhoto src="/photo.jpg" alt="" className="opacity-40" data-testid="frame" />,
    );
    const frame = container.firstElementChild as HTMLElement;

    expect(frame.classList.contains('opacity-40')).toBe(true);
    expect(frame.getAttribute('data-testid')).toBe('frame');
  });
});

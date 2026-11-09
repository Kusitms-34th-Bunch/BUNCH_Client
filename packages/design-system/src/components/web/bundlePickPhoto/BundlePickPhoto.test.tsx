import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BundlePickPhoto } from './BundlePickPhoto';

describe('BundlePickPhoto', () => {
  it('사진을 대체 텍스트와 함께 그리고 className은 틀에 적용한다', () => {
    const { container } = render(
      <BundlePickPhoto src="photo.png" alt="달리는 사람들" className="mt-2" />,
    );

    expect(screen.getByRole<HTMLImageElement>('img', { name: '달리는 사람들' }).src).toContain(
      'photo.png',
    );
    expect(container.firstElementChild?.classList.contains('mt-2')).toBe(true);
    expect(container.firstElementChild?.classList.contains('rounded-r3')).toBe(true);
  });
});

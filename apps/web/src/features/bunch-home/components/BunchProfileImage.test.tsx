import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BunchProfileImage } from './BunchProfileImage';

describe('BunchProfileImage', () => {
  it('대표 이미지가 있으면 그 주소를 장식 이미지로 보여 준다', () => {
    const { container } = render(
      <BunchProfileImage imageSrc="/cover.jpg" characterType="TYPE_3" />,
    );

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/cover.jpg');
    expect(image).toHaveAttribute('alt', '');
  });

  it('대표 이미지가 없으면 번치 성격별 기본 이미지를 보여 준다', () => {
    const { container } = render(<BunchProfileImage characterType="TYPE_2" />);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/images/default-bunch/type-2.svg',
    );
  });
});

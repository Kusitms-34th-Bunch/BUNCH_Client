import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BunchAvatar } from './BunchAvatar';

describe('BunchAvatar', () => {
  it('src가 있으면 대표 이미지를 그리고 alt를 이름으로 준다', () => {
    render(<BunchAvatar src="/bunch.png" alt="퇴근런클럽 대표 이미지" />);

    expect(screen.getByRole('img', { name: '퇴근런클럽 대표 이미지' }).getAttribute('src')).toBe(
      '/bunch.png',
    );
  });

  it('alt를 비우면 이미지는 장식으로 숨겨진다', () => {
    const { container } = render(<BunchAvatar src="/bunch.png" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('src가 없으면 이미지 없이 빈 원만 그린다', () => {
    const { container } = render(<BunchAvatar />);

    expect(container.querySelector('img')).toBeNull();
  });

  it('onCameraClick이 없으면 카메라 버튼이 없다', () => {
    render(<BunchAvatar src="/bunch.png" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('카메라 버튼은 기본 이름을 가지고 누르면 onCameraClick을 호출한다', async () => {
    const onCameraClick = vi.fn();
    render(<BunchAvatar onCameraClick={onCameraClick} />);

    await userEvent.click(screen.getByRole('button', { name: '사진 변경' }));

    expect(onCameraClick).toHaveBeenCalledTimes(1);
  });

  it('카메라 버튼 이름을 바꿀 수 있고 키보드로 누를 수 있다', async () => {
    const onCameraClick = vi.fn();
    render(<BunchAvatar onCameraClick={onCameraClick} cameraLabel="번치 사진 바꾸기" />);

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '번치 사진 바꾸기' }));
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onCameraClick).toHaveBeenCalledTimes(2);
  });

  it('카메라 버튼은 form 안에서 눌러도 제출하지 않고 아이콘은 장식이다', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <BunchAvatar onCameraClick={() => {}} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button').querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('className을 루트에 전달한다', () => {
    const { container } = render(<BunchAvatar className="custom" />);

    expect(container.firstElementChild?.className).toContain('custom');
  });
});

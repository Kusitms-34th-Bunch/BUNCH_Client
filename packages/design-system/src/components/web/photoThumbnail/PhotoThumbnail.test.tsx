import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhotoThumbnail } from './PhotoThumbnail';

const src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

describe('PhotoThumbnail', () => {
  it('선택 모드가 꺼져 있으면 사진만 그리고 버튼이 아니다', () => {
    render(<PhotoThumbnail src={src} alt="달리는 사람들" />);
    expect(screen.getByRole('img', { name: '달리는 사람들' })).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('선택 모드에서는 aria-pressed 토글 버튼이고 이름은 alt다', () => {
    render(<PhotoThumbnail src={src} alt="달리는 사람들" selectionMode />);
    const button = screen.getByRole('button', { name: '달리는 사람들' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('누르면 onClick을 호출한다', () => {
    const onClick = vi.fn();
    render(<PhotoThumbnail src={src} alt="사진" selectionMode onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('선택되면 aria-pressed=true, 오버레이, 순서를 그린다', () => {
    const { container } = render(
      <PhotoThumbnail src={src} alt="사진" selectionMode selected selectionOrder={2} />,
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.bg-overlay-pressed.opacity-100')).toBeTruthy();
    expect(button.textContent).toContain('2');
    expect(screen.getByText('2번째 선택')).toBeTruthy();
  });

  it('선택 전에는 오버레이가 투명하고 순서가 없으며 인디케이터만 그린다', () => {
    const { container } = render(<PhotoThumbnail src={src} alt="사진" selectionMode />);
    expect(container.querySelector('.bg-overlay-pressed.opacity-100')).toBeNull();
    expect(container.querySelector('.bg-overlay-pressed.opacity-0')).toBeTruthy();
    expect(container.querySelector('.rounded-full')).toBeTruthy();
    expect(screen.queryByText(/번째 선택/)).toBeNull();
  });

  it('선택 모드가 꺼져 있으면 selected여도 인디케이터와 오버레이가 없다', () => {
    const { container } = render(
      <PhotoThumbnail src={src} alt="사진" selected selectionOrder={1} />,
    );
    expect(container.querySelector('.rounded-full')).toBeNull();
    expect(container.querySelector('.bg-overlay-pressed')).toBeNull();
  });

  it('123px 정사각형이고 사진은 object-cover다', () => {
    const { container } = render(<PhotoThumbnail src={src} alt="사진" />);
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toContain('aspect-square');
    expect(frame.className).toContain('w-30.75');
    expect(container.querySelector('img')?.className).toContain('object-cover');
  });

  it('선택돼도 순서가 없으면 안내 글자를 그리지 않는다', () => {
    render(<PhotoThumbnail src={src} alt="사진" selectionMode selected />);
    expect(screen.queryByText(/번째 선택/)).toBeNull();
  });

  it('호출자가 aria-pressed를 넘겨도 selected 값이 우선한다', () => {
    render(<PhotoThumbnail src={src} alt="사진" selectionMode aria-pressed={true} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });

  it('선택되면 이름에 alt와 순서가 함께 들어간다', () => {
    render(<PhotoThumbnail src={src} alt="사진" selectionMode selected selectionOrder={2} />);
    expect(screen.getByRole('button', { name: '사진 2번째 선택' })).toBeTruthy();
  });

  it('사진은 화면 밖에서 나중에 불러오도록 lazy로 그린다', () => {
    const { container } = render(<PhotoThumbnail src={src} alt="사진" />);
    const image = container.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
  });

  it('사진을 불러오지 못하면 onImageError를 부른다', () => {
    const onImageError = vi.fn();
    const { container } = render(
      <PhotoThumbnail src={src} alt="사진" onImageError={onImageError} />,
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(onImageError).toHaveBeenCalledTimes(1);
  });

  it('선택 모드의 사진도 onImageError를 부른다', () => {
    const onImageError = vi.fn();
    const { container } = render(
      <PhotoThumbnail src={src} alt="사진" selectionMode onImageError={onImageError} />,
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(onImageError).toHaveBeenCalledTimes(1);
  });
});

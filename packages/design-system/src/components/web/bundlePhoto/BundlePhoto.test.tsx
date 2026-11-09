import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BundlePhoto } from './BundlePhoto';

const photos = [{ src: 'a.jpg' }, { src: 'b.jpg' }, { src: 'c.jpg' }];

describe('BundlePhoto', () => {
  it('사진마다 여는 버튼이 있고 누른 사진 순번을 알린다', async () => {
    const onPhotoClick = vi.fn();
    render(<BundlePhoto photos={photos} onPhotoClick={onPhotoClick} />);

    await userEvent.click(screen.getByRole('button', { name: '번들 사진 2/3 열기' }));
    expect(onPhotoClick).toHaveBeenCalledWith(1);
  });

  it('상세는 사진마다 순번이 있고, pick한 멤버가 있는 사진에만 pick 버튼이 있다', () => {
    render(<BundlePhoto variant="detail" photos={[{ src: 'a.jpg' }, { src: 'b.jpg' }]} />);

    expect(screen.getByRole('group', { name: '번들 사진' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '1 / 2' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '2 / 2' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^pick / })).toBeNull();
  });

  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [5, 3],
  ])('pick이 %d명이면 얼굴 %d개를 겹친다', (count, faces) => {
    const pickers = Array.from({ length: count }, (_, index) => ({ name: `멤버${index}` }));
    render(<BundlePhoto variant="detail" photos={[{ src: 'a.jpg', pickers }]} />);

    expect(
      screen.getByRole('button', { name: /^pick / }).querySelectorAll('[class*="absolute"]'),
    ).toHaveLength(faces);
  });

  it('pick을 누르면 전체 멤버가 펼쳐지고 다시 누르면 접힌다', async () => {
    const pickers = ['은우', '경진', '수인', '효찬', '경준'].map((name) => ({ name }));
    const { container } = render(
      <BundlePhoto variant="detail" photos={[{ src: 'a.jpg', pickers }]} />,
    );
    const button = screen.getByRole('button', { name: 'pick 은우, 경진, 수인, 효찬, 경준' });

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('ul')).toBeNull();

    await userEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    // 맨 아래 얼굴은 버튼 안, 나머지 4명이 위로 펼쳐짐
    expect(container.querySelectorAll('ul > li')).toHaveLength(4);
    expect(button.querySelectorAll('[class*="absolute"]')).toHaveLength(1);

    await userEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('ul')).toBeNull();
  });

  it('제목·위치·날짜는 썸네일의 첫 사진에만, 순번은 2장 이상일 때만 보인다', () => {
    const info = { title: '제주 여행', date: '2026년 7월 9일' };
    const { rerender } = render(<BundlePhoto photos={photos} info={info} />);
    expect(screen.getAllByRole('heading', { name: '제주 여행' })).toHaveLength(1);

    rerender(<BundlePhoto photos={photos.slice(0, 1)} variant="detail" info={info} />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('img', { name: /\// })).toBeNull();
  });

  it('썸네일 첫 사진에는 번치 버튼이 있고 순번은 다음 사진부터 보인다', async () => {
    const onClick = vi.fn();
    render(
      <BundlePhoto
        photos={photos}
        info={{ title: '제주 여행' }}
        author={{ name: '여행가조', time: '2일 전', onClick }}
        onPhotoClick={() => {}}
      />,
    );
    expect(screen.queryByRole('img', { name: /\// })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '여행가조 2일 전' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    const list = screen.getByRole('button', { name: '번들 사진 1/3 열기' }).parentElement!
      .parentElement!;
    Object.defineProperty(list, 'clientWidth', { value: 343 });
    list.scrollLeft = 343;
    fireEvent.scroll(list);
    expect(screen.getByRole('img', { name: '2 / 3' })).toBeTruthy();
  });
});

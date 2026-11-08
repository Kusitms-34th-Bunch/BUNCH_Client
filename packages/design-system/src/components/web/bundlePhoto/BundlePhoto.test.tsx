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

  it('넘기면 순번이 바뀌고 바뀐 순번을 알린다', () => {
    const onIndexChange = vi.fn();
    render(<BundlePhoto photos={photos} variant="detail" onIndexChange={onIndexChange} />);
    const list = screen.getByRole('group', { name: '번들 사진' });

    expect(screen.getByRole('img', { name: '1 / 3' })).toBeTruthy();
    Object.defineProperty(list, 'clientWidth', { value: 375 });
    list.scrollLeft = 750;
    fireEvent.scroll(list);
    expect(screen.getByRole('img', { name: '3 / 3' })).toBeTruthy();
    expect(onIndexChange).toHaveBeenCalledWith(2);
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

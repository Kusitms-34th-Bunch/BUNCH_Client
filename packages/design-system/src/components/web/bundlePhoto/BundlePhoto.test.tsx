import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BundlePhoto, type BundlePhotoProps } from './BundlePhoto';

const renderPhoto = (props?: Partial<BundlePhotoProps>) =>
  render(<BundlePhoto src="photo.png" alt="러닝하는 사람들" {...props} />);

describe('BundlePhoto', () => {
  it('사진을 alt와 함께 그린다', () => {
    renderPhoto();
    const image = screen.getByRole('img', { name: '러닝하는 사람들' });

    expect(image.getAttribute('src')).toBe('photo.png');
    expect(image.classList.contains('object-cover')).toBe(true);
  });

  it('alt가 빈 문자열이면 장식 사진으로 숨겨진다', () => {
    renderPhoto({ alt: '' });

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('기본은 330px(m) 정사각에 반경 r4이고 s는 300px이다', () => {
    const { container, rerender } = renderPhoto();
    const frame = container.firstElementChild as HTMLElement;

    expect(frame.classList.contains('w-82.5')).toBe(true);
    expect(frame.classList.contains('aspect-square')).toBe(true);
    expect(frame.classList.contains('rounded-r4')).toBe(true);
    expect(frame.classList.contains('overflow-hidden')).toBe(true);

    rerender(<BundlePhoto src="photo.png" alt="사진" size="s" />);

    expect((container.firstElementChild as HTMLElement).classList.contains('w-75')).toBe(true);
    expect((container.firstElementChild as HTMLElement).classList.contains('w-82.5')).toBe(false);
  });

  it('className으로 폭을 덮어쓸 수 있다', () => {
    const { container } = renderPhoto({ className: 'w-full' });
    const frame = container.firstElementChild as HTMLElement;

    expect(frame.classList.contains('w-full')).toBe(true);
    expect(frame.classList.contains('w-82.5')).toBe(false);
  });

  it('uploader와 onDelete가 없으면 사진 위에 아무것도 얹지 않는다', () => {
    const { container } = renderPhoto();

    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('uploader를 주면 왼쪽 위에 31px 아바타가 얹히고 "{이름}님이 올린 사진"이 대체 텍스트다', () => {
    renderPhoto({ uploader: { name: '지예', src: 'avatar.png' } });
    const avatar = screen.getByRole('img', { name: '지예님이 올린 사진' });
    const circle = avatar.parentElement as HTMLElement;

    expect(avatar.getAttribute('src')).toBe('avatar.png');
    expect(circle.classList.contains('size-7.75')).toBe(true);
    expect(circle.classList.contains('size-22.5')).toBe(false);
    expect(circle.classList.contains('border-border-tertiary')).toBe(true);
  });

  it('프로필 사진이 없는 uploader도 이름이 스크린 리더용 글자로 전달된다', () => {
    renderPhoto({ uploader: { name: '지예' } });

    expect(screen.getByText('지예님이 올린 사진').classList.contains('sr-only')).toBe(true);
  });

  it('uploaderLabel로 아바타를 읽어 주는 글자를 바꾼다', () => {
    const { rerender } = renderPhoto({
      uploader: { name: '지예', src: 'avatar.png' },
      uploaderLabel: 'Uploaded by Jiye',
    });

    expect(screen.getByRole('img', { name: 'Uploaded by Jiye' })).toBeTruthy();

    rerender(
      <BundlePhoto
        src="photo.png"
        alt="사진"
        uploader={{ name: '지예' }}
        uploaderLabel="Uploaded by Jiye"
      />,
    );

    expect(screen.getByText('Uploaded by Jiye').classList.contains('sr-only')).toBe(true);
  });

  it('사진 위 줄은 사진 위쪽에 16px 여백으로 놓인다', () => {
    const { container } = renderPhoto({ uploader: { name: '지예' } });
    const row = container.firstElementChild?.querySelector('div') as HTMLElement;

    expect(row.classList.contains('absolute')).toBe(true);
    expect(row.classList.contains('top-0')).toBe(true);
    expect(row.classList.contains('p-s8')).toBe(true);
  });

  it('page를 주면 왼쪽 아래에 16px 여백으로 "현재/전체" 표시가 얹히고 없으면 없다', () => {
    const { rerender } = renderPhoto();

    expect(screen.queryByRole('img', { name: /\d \/ \d/ })).toBeNull();

    rerender(<BundlePhoto src="/a.png" alt="러닝" page={{ current: 1, total: 4 }} />);
    const { classList } = screen.getByRole('img', { name: '1 / 4' });

    expect(classList.contains('absolute')).toBe(true);
    expect(classList.contains('bottom-s8')).toBe(true);
    expect(classList.contains('left-s8')).toBe(true);
  });

  it('pageLabel로 페이지 표시를 읽어 주는 글자를 바꾼다', () => {
    renderPhoto({ page: { current: 2, total: 4 }, pageLabel: '사진 4장 중 2번째' });

    expect(screen.getByRole('img', { name: '사진 4장 중 2번째' })).toBeTruthy();
  });

  it('onDelete를 주면 "사진 삭제" 버튼이 생기고 누르면 호출된다', () => {
    const onDelete = vi.fn();
    renderPhoto({ onDelete });
    const button = screen.getByRole('button', { name: '사진 삭제' });

    expect(button.getAttribute('type')).toBe('button');

    fireEvent.click(button);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('deleteLabel로 삭제 버튼 이름을 바꾸고 아이콘은 숨긴다', () => {
    const { container } = renderPhoto({ onDelete: () => {}, deleteLabel: 'Remove photo' });

    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeTruthy();
    expect(container.querySelector('button svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('삭제 버튼은 24px 원에 scrim 배경·블러이고 32px 터치 영역을 가진다', () => {
    renderPhoto({ onDelete: () => {} });
    const { classList } = screen.getByRole('button');

    expect(classList.contains('size-6')).toBe(true);
    expect(classList.contains('rounded-full')).toBe(true);
    expect(classList.contains('bg-overlay-scrim')).toBe(true);
    expect(classList.contains('backdrop-blur-[15px]')).toBe(true);
    expect(classList.contains('ml-auto')).toBe(true);
    expect(classList.contains('before:-inset-1')).toBe(true);
    expect(classList.contains('focus-visible:outline-2')).toBe(true);
  });

  it('div 속성이 사진 틀에 합쳐진다', () => {
    renderPhoto({ 'data-testid': 'frame' } as never);

    expect(screen.getByTestId('frame')).toBeTruthy();
  });
});

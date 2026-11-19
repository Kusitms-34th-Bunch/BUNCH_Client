import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PhotoBoxPhoto } from '../lib/types';
import { PhotoDetailSlide } from './PhotoDetailSlide';

const photo = (src: string): PhotoBoxPhoto => ({
  id: '1',
  src,
  alt: '사진',
  takenAt: null,
  uploadedAt: '2026-11-20T00:00:00Z',
  uploaderIds: [],
  usedInDraftBundle: false,
  status: 'ready',
});

const load = (image: HTMLElement, width: number, height: number) => {
  Object.defineProperty(image, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(image, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(image);
};

const frame = (image: HTMLElement) => image.parentElement!;

describe('PhotoDetailSlide 틀 높이', () => {
  it('썸네일 비율로 그리다가 원본을 다 받으면 원본 비율 높이로 바꾼다', () => {
    const props = { members: [], chromeHidden: false, current: true };
    const { rerender } = render(<PhotoDetailSlide photo={photo('/thumb.jpg')} {...props} />);
    const image = screen.getByRole('img', { name: '사진' });
    // 비율을 모르는 처음에는 정사각형 높이(전환이 숫자 높이끼리 일어나게)
    expect(frame(image).style.height).toBe('calc(100cqw / 1)');

    load(image, 300, 300);
    expect(frame(image).style.height).toBe('calc(100cqw / 1)');

    // 원본 주소로 바뀌어도 다 받기 전에는 이전(정사각형) 높이 유지
    rerender(<PhotoDetailSlide photo={photo('/original.jpg')} {...props} />);
    expect(frame(image).style.height).toBe('calc(100cqw / 1)');

    load(image, 300, 400);
    expect(frame(image).style.height).toBe('calc(100cqw / 0.75)');
  });

  it('썸네일을 받기 전에 원본 주소로 바뀌어도 정사각형에서 원본 비율로 바뀐다', () => {
    const props = { members: [], chromeHidden: false, current: true };
    const { rerender } = render(<PhotoDetailSlide photo={photo('/thumb-2.jpg')} {...props} />);
    rerender(<PhotoDetailSlide photo={photo('/original-2.jpg')} {...props} />);
    const image = screen.getByRole('img', { name: '사진' });
    expect(frame(image).style.height).toBe('calc(100cqw / 1)');

    load(image, 300, 600);
    expect(frame(image).style.height).toBe('calc(100cqw / 0.5)');
  });

  it('미리 받아 비율을 아는 원본은 처음부터 그 높이로 그린다', () => {
    const props = { members: [], chromeHidden: false, current: true };
    const first = render(<PhotoDetailSlide photo={photo('/known.jpg')} {...props} />);
    load(screen.getByRole('img', { name: '사진' }), 400, 200);
    first.unmount();

    render(<PhotoDetailSlide photo={photo('/known.jpg')} {...props} />);
    expect(frame(screen.getByRole('img', { name: '사진' })).style.height).toBe('calc(100cqw / 2)');
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

// 다 받은 원본은 다음 프레임에 바꿈(들어오는 전환이 끝났는지 보고)
const nextFrame = () =>
  act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

const frame = () => screen.getByRole('img', { name: '사진' }).parentElement!;
// 보이지 않게 받는 새 주소의 이미지(alt 없음)
const pending = (container: HTMLElement, src: string) =>
  container.querySelector<HTMLImageElement>(`img[aria-hidden][src="${src}"]`)!;

describe('PhotoDetailSlide 틀 높이', () => {
  const props = { members: [], chromeHidden: false, current: true };

  it('원본을 다 받기 전에는 썸네일과 그 높이를 두고, 받으면 원본을 썸네일 위로 페이드인하며 원본 비율로 바꾼다', async () => {
    const { container, rerender } = render(
      <PhotoDetailSlide photo={photo('/thumb.jpg')} {...props} />,
    );
    // 비율을 모르는 처음에는 정사각형 높이(전환이 숫자 높이끼리 일어나게)
    expect(frame().style.height).toBe('calc(100cqw / 1)');
    load(screen.getByRole('img', { name: '사진' }), 300, 300);

    // 원본 주소가 와도 보이는 이미지는 썸네일 그대로(같은 img의 주소를 바꾸면 디코딩 전에 빈 칸이 깜빡임)
    rerender(<PhotoDetailSlide photo={photo('/original.jpg')} {...props} />);
    expect(screen.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('/thumb.jpg');
    expect(frame().style.height).toBe('calc(100cqw / 1)');

    load(pending(container, '/original.jpg'), 300, 400);

    await nextFrame();
    const shown = screen.getByRole('img', { name: '사진' });
    expect(shown.getAttribute('src')).toBe('/original.jpg');
    expect(frame().style.height).toBe('calc(100cqw / 0.75)');
    // 페이드인하는 동안 썸네일이 아래에 남고, 끝나면 치움
    expect(container.querySelector('img[aria-hidden][src="/thumb.jpg"]')).not.toBeNull();
    fireEvent.animationEnd(shown);
    expect(container.querySelector('img[src="/thumb.jpg"]')).toBeNull();
  });

  it('썸네일을 받기 전에 원본 주소로 바뀌어도 원본을 다 받으면 원본 비율로 바뀐다', async () => {
    const { container, rerender } = render(
      <PhotoDetailSlide photo={photo('/thumb-2.jpg')} {...props} />,
    );
    rerender(<PhotoDetailSlide photo={photo('/original-2.jpg')} {...props} />);
    expect(frame().style.height).toBe('calc(100cqw / 1)');

    load(pending(container, '/original-2.jpg'), 300, 600);

    await nextFrame();
    expect(frame().style.height).toBe('calc(100cqw / 0.5)');
  });

  it('원본만 받지 못하면 보이던 썸네일을 그대로 두고, 썸네일도 실패했으면 회색 자리표시로 바꾼다', async () => {
    const kept = render(<PhotoDetailSlide photo={photo('/thumb-3.jpg')} {...props} />);
    load(screen.getByRole('img', { name: '사진' }), 300, 300);
    kept.rerender(<PhotoDetailSlide photo={photo('/broken-3.jpg')} {...props} />);
    fireEvent.error(pending(kept.container, '/broken-3.jpg'));
    expect(screen.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('/thumb-3.jpg');
    kept.unmount();

    const failed = render(<PhotoDetailSlide photo={photo('/thumb-4.jpg')} {...props} />);
    fireEvent.error(screen.getByRole('img', { name: '사진' }));
    expect(screen.getByRole('img', { name: '불러오지 못한 사진' })).toBeTruthy();
    // 썸네일이 실패해도 원본이 오면 원본으로 보임
    failed.rerender(<PhotoDetailSlide photo={photo('/original-4.jpg')} {...props} />);
    load(pending(failed.container, '/original-4.jpg'), 300, 300);
    await nextFrame();
    expect(screen.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('/original-4.jpg');
    expect(screen.queryByRole('img', { name: '불러오지 못한 사진' })).toBeNull();
    failed.unmount();

    // 썸네일·원본이 모두 실패하면 자리표시로 남고 다시 받지 않음(한 주소만 기억하면 서로 덮어 반복)
    const both = render(<PhotoDetailSlide photo={photo('/thumb-8.jpg')} {...props} />);
    fireEvent.error(screen.getByRole('img', { name: '사진' }));
    both.rerender(<PhotoDetailSlide photo={photo('/original-8.jpg')} {...props} />);
    fireEvent.error(pending(both.container, '/original-8.jpg'));
    expect(screen.getByRole('img', { name: '불러오지 못한 사진' })).toBeTruthy();
    expect(both.container.querySelectorAll('img')).toHaveLength(0);
  });

  it('받아 둔 원본 img를 그대로 보이는 층으로 옮기고, 페이드 동안 hero 짝은 불투명한 아래 썸네일에 둔다', async () => {
    const { container, rerender } = render(
      <PhotoDetailSlide photo={photo('/thumb-5.jpg')} {...props} />,
    );
    const thumbnail = screen.getByRole('img', { name: '사진' });
    load(thumbnail, 300, 300);
    rerender(<PhotoDetailSlide photo={photo('/original-5.jpg')} {...props} />);
    const original = pending(container, '/original-5.jpg');
    load(original, 300, 400);
    await nextFrame();

    // 다시 디코딩하지 않게 같은 DOM 노드가 자리만 바꿈
    expect(screen.getByRole('img', { name: '사진' })).toBe(original);
    expect(container.querySelector('img[src="/thumb-5.jpg"]')).toBe(thumbnail);
    const heroes = container.querySelectorAll('[data-hero-exit-key]');
    expect(heroes).toHaveLength(1);
    expect(heroes[0]).toBe(thumbnail);

    fireEvent.animationEnd(original);
    expect(container.querySelectorAll('[data-hero-exit-key]')[0]).toBe(original);
  });

  it('load 뒤에도 디코딩이 끝나기 전에는 바꾸지 않고, 디코딩에 실패하면 썸네일을 그대로 둔다', async () => {
    let finish = () => {};
    let fail = () => {};
    const decode = vi
      .spyOn(HTMLImageElement.prototype, 'decode')
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
      .mockImplementationOnce(
        () => new Promise<void>((_, reject) => (fail = () => reject(new Error('decode')))),
      );
    try {
      const done = render(<PhotoDetailSlide photo={photo('/thumb-9.jpg')} {...props} />);
      load(screen.getByRole('img', { name: '사진' }), 300, 300);
      done.rerender(<PhotoDetailSlide photo={photo('/original-9.jpg')} {...props} />);
      load(pending(done.container, '/original-9.jpg'), 300, 400);
      await nextFrame();
      expect(screen.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('/thumb-9.jpg');
      await act(async () => {
        finish();
        await Promise.resolve();
      });
      await nextFrame();
      expect(screen.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('/original-9.jpg');
      done.unmount();

      const failed = render(<PhotoDetailSlide photo={photo('/thumb-10.jpg')} {...props} />);
      load(screen.getByRole('img', { name: '사진' }), 300, 300);
      failed.rerender(<PhotoDetailSlide photo={photo('/original-10.jpg')} {...props} />);
      load(pending(failed.container, '/original-10.jpg'), 300, 400);
      await act(async () => {
        fail();
        await Promise.resolve();
      });
      await nextFrame();
      expect(screen.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('/thumb-10.jpg');
      expect(failed.container.querySelector('img[src="/original-10.jpg"]')).toBeNull();
    } finally {
      decode.mockRestore();
    }
  });

  describe('들어오는 화면 전환 중', () => {
    afterEach(() => {
      document.querySelector('[data-page-leaving]')?.remove();
      vi.restoreAllMocks();
    });

    it('hero가 날아가는 동안(나가는 화면 표식) 원본이 와도 바꾸지 않고 끝난 뒤 바꾼다', async () => {
      const frames: FrameRequestCallback[] = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
      const leaving = document.body.appendChild(document.createElement('div'));
      leaving.setAttribute('data-page-leaving', '');
      const { container, rerender } = render(
        <PhotoDetailSlide photo={photo('/thumb-6.jpg')} {...props} />,
      );
      rerender(<PhotoDetailSlide photo={photo('/original-6.jpg')} {...props} />);
      load(pending(container, '/original-6.jpg'), 300, 600);
      // decode 완료를 기다림
      await act(async () => {});
      // 표식이 남아 있는 동안 프레임이 돌아도 바꾸지 않음
      act(() => frames.splice(0).forEach((callback) => callback(0)));
      expect(screen.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('/thumb-6.jpg');
      expect(frames).toHaveLength(1);

      leaving.remove();
      act(() => frames.splice(0).forEach((callback) => callback(0)));
      expect(screen.getByRole('img', { name: '사진' }).getAttribute('src')).toBe('/original-6.jpg');
      expect(frame().style.height).toBe('calc(100cqw / 0.5)');
    });

    it('동작 줄이기면 페이드 없이 바로 바꾸고 아래 썸네일을 남기지 않는다', async () => {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query) =>
          ({
            matches: query.includes('reduce'),
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList,
      );
      const { container, rerender } = render(
        <PhotoDetailSlide photo={photo('/thumb-7.jpg')} {...props} />,
      );
      load(screen.getByRole('img', { name: '사진' }), 300, 300);
      rerender(<PhotoDetailSlide photo={photo('/original-7.jpg')} {...props} />);
      load(pending(container, '/original-7.jpg'), 300, 300);
      await nextFrame();
      expect(container.querySelector('img[src="/thumb-7.jpg"]')).toBeNull();
    });
  });

  it('미리 받아 비율을 아는 원본은 처음부터 그 높이로 그린다', () => {
    const first = render(<PhotoDetailSlide photo={photo('/known.jpg')} {...props} />);
    load(screen.getByRole('img', { name: '사진' }), 400, 200);
    first.unmount();

    render(<PhotoDetailSlide photo={photo('/known.jpg')} {...props} />);
    expect(frame().style.height).toBe('calc(100cqw / 2)');
  });
});

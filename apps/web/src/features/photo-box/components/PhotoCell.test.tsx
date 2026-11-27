import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { PhotoBoxPhoto } from '../lib/types';
import { PhotoCell } from './PhotoCell';

const photo = (src: string): PhotoBoxPhoto => ({
  id: '1',
  src,
  alt: '사진 1',
  takenAt: null,
  uploadedAt: '2026-11-27T00:00:00Z',
  uploaderIds: [],
  usedInDraftBundle: false,
  status: 'ready',
});

it('불러오지 못한 사진은 자리표시로 바꾸고, 새 주소를 받으면 다시 그리며 그 주소도 실패하면 다시 자리표시(#587)', () => {
  const { container, rerender } = render(<PhotoCell photo={photo('/expired.jpg')} />);
  const thumbnail = () => container.querySelector('img:not([aria-hidden])');
  fireEvent.error(thumbnail()!);
  expect(screen.getByRole('img', { name: '불러오지 못한 사진' })).toBeTruthy();
  expect(container.querySelector('img')).toBeNull();

  rerender(<PhotoCell photo={photo('/fresh.jpg')} />);
  expect(thumbnail()?.getAttribute('src')).toBe('/fresh.jpg');

  // 새 주소도 실패하면 다시 자리표시(img가 없어 더 시도하지 않음)
  fireEvent.error(thumbnail()!);
  expect(container.querySelector('img')).toBeNull();
});

it('들어가는 hero 동안 비는 칸을 메울 같은 사진을 평소에는 숨겨 둔다(#587)', () => {
  const { container } = render(<PhotoCell photo={photo('/a.jpg')} />);
  const backing = container.querySelector('img[aria-hidden="true"]');
  expect(backing?.getAttribute('src')).toBe('/a.jpg');
  expect(backing?.getAttribute('decoding')).toBe('sync');
  expect(backing?.getAttribute('loading')).toBe('lazy');
  expect(backing?.className).toContain('invisible');
  expect(backing?.className).toContain('in-data-page-leaving:visible');
});

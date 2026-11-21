import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DraftBundleList } from './DraftBundleList';

const bundle = {
  id: '7',
  title: '제주 여행',
  untitled: false,
  coverSrc: '/cover.jpg',
  members: [],
  canDelete: true,
};

describe('DraftBundleList', () => {
  it('카드에 닿을 때만 확인을 시작하고 휴지통에서는 시작하지 않는다', () => {
    const onPressStart = vi.fn();
    render(<DraftBundleList bundles={[bundle]} onPressStart={onPressStart} onDelete={() => {}} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: '제주 여행 삭제' }));
    expect(onPressStart).not.toHaveBeenCalled();

    const card = document.querySelector('[data-card-button]');
    if (!card) throw new Error('card button missing');
    fireEvent.pointerDown(card);
    expect(onPressStart).toHaveBeenCalledWith('7');
  });
});

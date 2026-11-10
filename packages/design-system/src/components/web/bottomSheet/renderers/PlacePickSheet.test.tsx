import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlacePickSheet } from './PlacePickSheet';

afterEach(cleanup);

const places = [
  { id: 'a', name: '애월 한담해변', address: '제주 제주시 애월읍', picked: false },
  { id: 'b', name: '한라산', picked: true },
];

describe('PlacePickSheet', () => {
  it('장소마다 담긴 상태를 보여 주고, 누르면 id를 알리되 닫지 않는다', async () => {
    const onPick = vi.fn();
    const onOpenChange = vi.fn();
    render(<PlacePickSheet open onOpenChange={onOpenChange} places={places} onPick={onPick} />);

    expect(await screen.findByRole('dialog', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(screen.getByText('제주 제주시 애월읍')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '콕 했어요', description: '한라산' }));

    expect(onPick).toHaveBeenCalledWith('b');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('「취소」는 닫기를 요청한다', async () => {
    const onOpenChange = vi.fn();
    render(<PlacePickSheet open onOpenChange={onOpenChange} places={places} onPick={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: '취소' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

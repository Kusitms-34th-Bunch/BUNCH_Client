import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BundleRecommendSheet, type BundleRecommendItem } from './BundleRecommendSheet';

afterEach(cleanup);

const bundles: BundleRecommendItem[] = [
  {
    id: 'a',
    imageSrc: 'a.png',
    title: '성수동 러닝 모임',
    members: ['지예', '경진'],
    photoCount: 8,
    month: 8,
    day: 28,
  },
  {
    id: 'b',
    imageSrc: 'b.png',
    title: '한강 피크닉',
    members: ['수인'],
    photoCount: 3,
    month: 9,
    day: 2,
  },
];

describe('BundleRecommendSheet', () => {
  it('추천 번들 카드를 모두 보여 준다', async () => {
    render(
      <BundleRecommendSheet open onOpenChange={() => {}} bundles={bundles} onSelect={() => {}} />,
    );

    expect(await screen.findByRole('dialog', { name: /빠르게 번들을 만들어보세요/ })).toBeTruthy();
    expect(screen.getByText('성수동 러닝 모임')).toBeTruthy();
    expect(screen.getByText('한강 피크닉')).toBeTruthy();
  });

  it('카드를 누르면 그 번들 id로 onSelect를 부른다', async () => {
    const onSelect = vi.fn();
    render(
      <BundleRecommendSheet open onOpenChange={() => {}} bundles={bundles} onSelect={onSelect} />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '한강 피크닉' }));

    expect(onSelect).toHaveBeenCalledWith('b');
  });
});

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
      <BundleRecommendSheet
        emptyLabel="추천 번들"
        emptyTitle="아직 추천할 번들이 없어요"
        emptyDescription="함께한 순간이 쌓이면 번들을 추천해 드릴게요."
        open
        onOpenChange={() => {}}
        bundles={bundles}
        onSelect={() => {}}
        onOpenDetail={() => {}}
      />,
    );

    expect(await screen.findByRole('dialog', { name: /빠르게 번들을 만들어보세요/ })).toBeTruthy();
    expect(screen.getByText('성수동 러닝 모임')).toBeTruthy();
    expect(screen.getByText('한강 피크닉')).toBeTruthy();
  });

  it('카드를 누르면 그 번들 id로 onSelect를 부른다', async () => {
    const onSelect = vi.fn();
    render(
      <BundleRecommendSheet
        emptyLabel="추천 번들"
        emptyTitle="아직 추천할 번들이 없어요"
        emptyDescription="함께한 순간이 쌓이면 번들을 추천해 드릴게요."
        open
        onOpenChange={() => {}}
        bundles={bundles}
        onSelect={onSelect}
        onOpenDetail={() => {}}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '한강 피크닉' }));

    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('추천이 없으면 제목 없이 빈 상태를 보여 준다', async () => {
    render(
      <BundleRecommendSheet
        emptyLabel="추천 번들"
        emptyTitle="아직 추천할 번들이 없어요"
        emptyDescription="함께한 순간이 쌓이면 번들을 추천해 드릴게요."
        open
        onOpenChange={() => {}}
        bundles={[]}
        onSelect={() => {}}
        onOpenDetail={() => {}}
      />,
    );

    expect(await screen.findByRole('dialog', { name: '추천 번들' })).toBeTruthy();
    expect(screen.getByText('아직 추천할 번들이 없어요')).toBeTruthy();
    expect(screen.queryByText(/빠르게 번들을 만들어보세요/)).toBeNull();
  });
});

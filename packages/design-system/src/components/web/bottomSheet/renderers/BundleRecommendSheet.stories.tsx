import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../../../core/button';
import { BundleRecommendSheet, type BundleRecommendItem } from './BundleRecommendSheet';

const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="316" height="178"><rect width="316" height="178" fill="#5a9fae"/></svg>',
)}`;

const bundles: BundleRecommendItem[] = [
  {
    id: 'a',
    imageSrc: SAMPLE_IMAGE,
    title: '성수동 러닝 모임',
    members: ['지예', '경진', '수인', '은우', '경준'],
    photoCount: 8,
    month: 8,
    day: 28,
  },
  {
    id: 'b',
    imageSrc: SAMPLE_IMAGE,
    title: '성수동 러닝 모임',
    members: ['지예', '경진', '수인', '은우', '경준', '민지', '서연'],
    photoCount: 8,
    month: 8,
    day: 28,
  },
];

const meta = {
  title: 'Web/BottomSheet/BundleRecommendSheet',
  component: BundleRecommendSheet,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onOpenChange: () => {}, bundles, onSelect: () => {} },
  render: function Render(args) {
    const [open, setOpen] = useState(args.open);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          추천 번들
        </Button>
        <BundleRecommendSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </>
    );
  },
} satisfies Meta<typeof BundleRecommendSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 카드가 많으면 본문만 스크롤 */
export const ManyBundles: Story = {
  args: {
    bundles: Array.from({ length: 5 }, (_, index) => ({ ...bundles[0]!, id: String(index) })),
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PlacePickItem } from './PlacePickItem';

const meta = {
  title: 'Web/Feed/PlacePickItem',
  component: PlacePickItem,
  args: { name: '애월 한담해변', address: '제주 제주시 애월읍', picked: false, onPick: () => {} },
  decorators: [
    (Story) => (
      <div className="w-93.75">
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    const [picked, setPicked] = useState(args.picked);
    return <PlacePickItem {...args} picked={picked} onPick={() => setPicked(!picked)} />;
  },
} satisfies Meta<typeof PlacePickItem>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `State=Default` */
export const Default: Story = {};

/** Figma `State=Selected` */
export const Selected: Story = { args: { picked: true } };

/** 긴 이름 */
export const LongName: Story = {
  args: { name: '제주 애월 한담해변 산책로 앞 바다가 보이는 카페 거리 입구' },
};

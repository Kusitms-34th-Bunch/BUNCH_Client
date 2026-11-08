import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PlacePickButton } from './PlacePickButton';

const meta = {
  title: 'Web/Feed/PlacePickButton',
  component: PlacePickButton,
  args: { picked: false },
  render: function Render(args) {
    const [picked, setPicked] = useState(args.picked);
    return <PlacePickButton {...args} picked={picked} onClick={() => setPicked(!picked)} />;
  },
} satisfies Meta<typeof PlacePickButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 담기 전(누르면 담긴 모양으로) */
export const Default: Story = {};

/** 담긴 뒤 */
export const Picked: Story = { args: { picked: true } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LikeButton } from './LikeButton';

const meta = {
  title: 'Web/Feed/LikeButton',
  component: LikeButton,
  args: { liked: false, count: 4 },
  render: function Render(args) {
    const [liked, setLiked] = useState(args.liked);
    const [count, setCount] = useState(args.count);
    return (
      <LikeButton
        {...args}
        liked={liked}
        count={count}
        onClick={() => {
          setLiked(!liked);
          setCount(count + (liked ? -1 : 1));
        }}
      />
    );
  },
} satisfies Meta<typeof LikeButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Liked=False`. 누르면 하트 모션 */
export const Default: Story = {};

/** Figma `Liked=True` */
export const Liked: Story = { args: { liked: true } };

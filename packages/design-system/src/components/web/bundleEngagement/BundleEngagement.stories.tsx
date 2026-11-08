import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { BundleEngagement } from './BundleEngagement';

const members = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버${index + 1}` }));

const meta = {
  title: 'Web/Feed/BundleEngagement',
  component: BundleEngagement,
  args: { liked: false, likeCount: 4, onLike: () => {}, commentCount: 4, onComment: () => {} },
  decorators: [
    (Story) => (
      <div className="w-93.75">
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    const [liked, setLiked] = useState(args.liked);
    return (
      <BundleEngagement
        {...args}
        liked={liked}
        likeCount={args.likeCount + (liked === args.liked ? 0 : liked ? 1 : -1)}
        onLike={() => setLiked(!liked)}
      />
    );
  },
} satisfies Meta<typeof BundleEngagement>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 피드 카드 아래 줄 */
export const Default: Story = {};

/** Figma `showParticipant`: 오른쪽 참여 멤버 */
export const WithMembers: Story = {
  args: { liked: true, members: members(7), onMembers: () => {} },
};

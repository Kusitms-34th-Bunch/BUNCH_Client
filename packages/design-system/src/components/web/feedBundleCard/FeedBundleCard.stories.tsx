import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FeedBundleCard } from './FeedBundleCard';

const photo = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="375" height="469"><rect width="375" height="469" fill="${color}"/></svg>`)}`;

const members = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버${index + 1}` }));

const meta = {
  title: 'Web/Feed/FeedBundleCard',
  component: FeedBundleCard,
  args: {
    bunchName: '여행가조',
    time: '2일 전',
    onBunchClick: () => {},
    members: members(7),
    onMembers: () => {},
    photos: ['#9fb8a0', '#a7adff', '#f3c1a8', '#7c8fa8'].map((color) => ({ src: photo(color) })),
    title: '제주 3박4일 여행 아카이빙',
    location: '애월읍 외 1곳',
    onLocationClick: () => {},
    date: '2026년 7월 9일',
    onPhotoClick: () => {},
    liked: false,
    likeCount: 4,
    onLike: () => {},
    commentCount: 4,
    onComment: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    const [liked, setLiked] = useState(args.liked);
    return (
      <FeedBundleCard
        {...args}
        liked={liked}
        likeCount={args.likeCount + (liked === args.liked ? 0 : liked ? 1 : -1)}
        onLike={() => setLiked(!liked)}
      />
    );
  },
} satisfies Meta<typeof FeedBundleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Bundle Feed Card` */
export const Default: Story = {};

/** 위치·날짜 없음 */
export const TitleOnly: Story = { args: { location: undefined, date: undefined } };

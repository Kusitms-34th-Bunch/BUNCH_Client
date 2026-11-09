import type { Meta, StoryObj } from '@storybook/react-vite';
import { BundlePhoto } from './BundlePhoto';

const photo = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="375" height="469"><rect width="375" height="469" fill="${color}"/></svg>`)}`;

const photos = ['#9fb8a0', '#a7adff', '#f3c1a8', '#7c8fa8'].map((color) => ({ src: photo(color) }));

const meta = {
  title: 'Web/Feed/BundlePhoto',
  component: BundlePhoto,
  args: { photos },
  decorators: [
    (Story) => (
      <div className="w-93.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BundlePhoto>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `State=Thumbnail`: 첫 사진 위 제목·위치·날짜, 좌우로 넘김 */
export const Thumbnail: Story = {
  args: {
    info: {
      title: '제주 3박4일 여행 아카이빙',
      location: '애월읍 외 1곳',
      date: '2026년 7월 9일',
      onLocationClick: () => {},
    },
    onPhotoClick: () => {},
  },
};

/** Figma `Bundle Photo Card` `Type=Photo`: 둥근 카드를 넘기고 옆 사진이 살짝 보임 */
export const Detail: Story = { args: { variant: 'detail' } };

/** 사진 왼쪽 아래 pick: 누르면 전체 멤버를 펼침 */
export const Picked: Story = {
  args: {
    variant: 'detail',
    photos: photos.map((photo) => ({
      ...photo,
      pickers: ['은우', '경진', '수인', '효찬', '경준', '지예', '민수', '하율'].map((name) => ({
        name,
      })),
    })),
  },
};

/** 사진 1장이면 순번 없음 */
export const SinglePhoto: Story = { args: { variant: 'detail', photos: photos.slice(0, 1) } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { BundleInfo } from './BundleInfo';

const meta = {
  title: 'Web/Feed/BundleInfo',
  component: BundleInfo,
  args: {
    title: '제주 3박4일 여행 아카이빙',
    location: '애월읍 외 1곳',
    date: '2026년 7월 9일',
    onLocationClick: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BundleInfo>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 위치·날짜 모두 */
export const Default: Story = {};

/** 위치만 */
export const LocationOnly: Story = { args: { date: undefined } };

/** 날짜만 */
export const DateOnly: Story = { args: { location: undefined } };

/** 제목만 */
export const TitleOnly: Story = { args: { location: undefined, date: undefined } };

/** 사진 위(피드 카드 첫 사진) */
export const Overlay: Story = {
  args: { variant: 'overlay' },
  decorators: [
    (Story) => (
      <div className="bg-surface-inversed p-padding-p10">
        <Story />
      </div>
    ),
  ],
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { SuggestedBundleCard } from './SuggestedBundleCard';

/** 예시 대표 사진(바다와 하늘색 그라데이션) */
const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="316" height="178"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb7c4"/><stop offset="0.6" stop-color="#5a9fae"/><stop offset="1" stop-color="#2f5b6b"/></linearGradient></defs><rect width="316" height="178" fill="url(#g)"/></svg>',
)}`;

const meta = {
  title: 'Web/SuggestedBundleCard',
  component: SuggestedBundleCard,
  args: {
    imageSrc: SAMPLE_IMAGE,
    title: '성수동 러닝 모임',
    members: ['지예', '경진', '수인', '은우', '경준'],
    photoCount: 8,
    month: 8,
    day: 28,
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-87">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SuggestedBundleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Figma `Selected`: 브랜드색 글자·칩과 안쪽 1px 테두리 */
export const Selected: Story = { args: { selected: true } };

/** 멤버가 6명을 넘으면 마지막 칩이 "마지막 멤버 외 N명"으로 줄어듦 */
export const ManyMembers: Story = {
  args: { members: ['지예', '경진', '수인', '은우', '경준', '효찬', '도윤', '하준'] },
};

/** 긴 번들 이름은 한 줄로 줄이고 화살표는 그대로 */
export const LongTitle: Story = {
  args: { title: '성수동 러닝 모임과 한강 러닝 크루가 함께한 가을 번들' },
};

/** 세 상태 나란히 보기(눌림은 카드를 누른 채로 확인) */
export const States: Story = {
  decorators: [
    (Story) => (
      <div className="gap-s8 flex flex-col">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <>
      <div className="w-87">
        <SuggestedBundleCard {...args} />
      </div>
      <div className="w-87">
        <SuggestedBundleCard {...args} selected />
      </div>
    </>
  ),
};

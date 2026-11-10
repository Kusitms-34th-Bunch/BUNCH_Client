import type { Meta, StoryObj } from '@storybook/react-vite';
import { InviteMemberCard } from './InviteMemberCard';

const meta = {
  title: 'Web/Card/InviteMemberCard',
  component: InviteMemberCard,
  args: {
    title: '멤버 초대하기',
    description: '친구를 초대해 함께 시작해 보세요',
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InviteMemberCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 누르고 있는 동안 어둡게 표시. 스냅샷에서는 제외하고 직접 눌러서 확인 */
export const Pressable: Story = { parameters: { chromatic: { disableSnapshot: true } } };

export const LongText: Story = {
  args: {
    title: '아주 긴 제목이 들어가도 카드 안에서 줄바꿈된다',
    description:
      '설명이 길어도 화살표를 밀어내지 않고 여러 줄로 보여 준다. 카드 높이는 내용만큼 늘어난다',
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-70">
        <Story />
      </div>
    ),
  ],
};

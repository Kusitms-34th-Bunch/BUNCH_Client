import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { GraphicPeopleIcon } from '../../../icons';
import { InviteMemberCard } from './InviteMemberCard';

const meta = {
  title: 'Web/InviteMemberCard',
  component: InviteMemberCard,
  args: {
    name: 'start',
    title: '멤버 초대하기',
    description: '친구에게 초대 링크를 보내 바로 함께 시작해요.',
    icon: <GraphicPeopleIcon />,
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InviteMemberCard>;

const InteractiveExample = (args: React.ComponentProps<typeof InviteMemberCard>) => {
  const [checked, setChecked] = useState(false);
  return <InviteMemberCard {...args} checked={checked} onChange={() => setChecked(true)} />;
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

/** 누르면 선택되고 다시 눌러도 유지(라디오). 스냅샷에서는 제외 */
export const Interactive: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: (args) => <InteractiveExample {...args} />,
};

export const LongText: Story = {
  args: {
    title: '아주 긴 제목이 들어가도 카드 안에서 줄바꿈된다',
    description:
      '설명이 길어도 아이콘을 밀어내지 않고 여러 줄로 보여 준다. 카드 높이는 내용만큼 늘어난다',
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

import type { Meta, StoryObj } from '@storybook/react-vite';
import { GraphicEditIcon } from '../../../icons';
import { CreateBunchCard } from './CreateBunchCard';

const meta = {
  title: 'Web/CreateBunchCard',
  component: CreateBunchCard,
  args: {
    title: '새 번치 만들기',
    description: '친구들을 초대하고 함께한 순간을 기록해봐요',
    icon: <GraphicEditIcon />,
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreateBunchCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 누르고 있는 동안 어둡게 표시. 스냅샷에서는 제외하고 직접 눌러서 확인 */
export const Pressable: Story = { parameters: { chromatic: { disableSnapshot: true } } };

export const LongText: Story = {
  args: {
    title: '아주 긴 시작 방식 이름이 들어가도 줄바꿈되어 모두 보인다',
    description:
      '설명이 길어도 말줄임 없이 여러 줄로 보여 준다. 카드 높이는 내용만큼 늘어난다. 좌우 여백이 없어 글자가 카드 가장자리에 닿는다',
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

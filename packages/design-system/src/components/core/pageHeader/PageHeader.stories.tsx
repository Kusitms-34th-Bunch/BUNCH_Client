import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stepper } from '../stepper';
import { PageHeader } from './PageHeader';

const title = '함께 기록할 멤버를 초대해보세요';
const description = '초대 링크를 보내면 친구가 번치에 참여할 수 있어요.';

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  args: { title, description, progress: <Stepper total={3} current={1} /> },
  decorators: [
    (Story) => (
      <div className="w-[375px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProgressTitleDescription: Story = {};

export const ProgressTitle: Story = { args: { description: undefined } };

export const TitleDescription: Story = { args: { progress: undefined } };

export const TitleOnly: Story = { args: { progress: undefined, description: undefined } };

export const LongText: Story = {
  args: {
    title: '아주 긴 제목이 들어와도 줄바꿈되어 모두 보여야 하고 잘리지 않아야 합니다',
    description:
      '설명이 길어지면 여러 줄로 이어지고, 조사가 혼자 다음 줄로 넘어가는 모양이 없는지 확인합니다.',
  },
};

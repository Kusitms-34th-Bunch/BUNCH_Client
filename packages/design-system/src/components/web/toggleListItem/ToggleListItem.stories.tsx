import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleListItem } from './ToggleListItem';

const meta = {
  title: 'Web/ListItem/ToggleListItem',
  component: ToggleListItem,
  args: {
    title: '앱 푸시 알림',
    description: '푸시를 꺼도 앱 알림 목록에는 그대로 쌓여요.',
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ToggleListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const On: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const WithoutDescription: Story = { args: { description: undefined } };

export const LongText: Story = {
  args: {
    title: '함께 있는 번치의 새 번들과 댓글, 좋아요 알림을 모두 받기',
    description:
      '푸시를 꺼도 앱 알림 목록에는 그대로 쌓여요. 알림 목록은 30일이 지나면 오래된 순서로 지워져요.',
  },
};

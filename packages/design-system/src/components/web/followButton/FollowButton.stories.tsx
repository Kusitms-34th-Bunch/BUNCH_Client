import type { Meta, StoryObj } from '@storybook/react-vite';
import { FollowButton } from './FollowButton';

const meta = {
  title: 'Web/FollowButton',
  component: FollowButton,
  args: { status: 'follow', className: 'w-full' },
  decorators: [(Story) => <div className="w-86">{Story()}</div>],
} satisfies Meta<typeof FollowButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Follow: Story = {};

export const Following: Story = { args: { status: 'following' } };

/** 비공개 계정에 팔로우를 요청한 상태 */
export const Requested: Story = { args: { status: 'requested' } };

export const Disabled: Story = { args: { disabled: true } };

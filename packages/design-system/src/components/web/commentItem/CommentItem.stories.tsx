import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommentItem } from './CommentItem';

const meta = {
  title: 'Web/Feed/CommentItem',
  component: CommentItem,
  args: {
    author: '수인',
    bunchName: '퇴근런클럽',
    date: '2025.06.08',
    content:
      '와 정말 재미있겠어요. 저도 다음에 퇴근하고 뛰고 싶어요! 오늘 하루도 수고하셨습니다람쥐 🐿️',
    replyCount: 1,
    onReply: () => {},
    onMore: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-93.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommentItem>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Type=Comment` */
export const Comment: Story = {};

export const NoReplyYet: Story = { args: { replyCount: 0 } };

/** Figma `Type=Type2`: 답글 */
export const Reply: Story = { args: { reply: true } };

/** Figma `Type=Type3`: 삭제된 댓글 */
export const Deleted: Story = { args: { deleted: true } };

/** Figma `Type=Type4`: 삭제된 답글 */
export const DeletedReply: Story = { args: { deleted: true, reply: true } };

/** 번치 성격별 배지 색 */
export const BadgeColors: Story = {
  render: (args) => (
    <div>
      <CommentItem {...args} bunchColor="brand" />
      <CommentItem {...args} bunchColor="orange" />
      <CommentItem {...args} bunchColor="pink" />
      <CommentItem {...args} bunchColor="green" />
    </div>
  ),
};

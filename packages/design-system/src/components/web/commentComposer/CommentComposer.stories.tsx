import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CommentComposer, type CommentComposerProps } from './CommentComposer';

const meta = {
  title: 'Web/Feed/CommentComposer',
  component: CommentComposer,
  args: {
    value: '',
    onValueChange: () => {},
    onSubmit: () => {},
    placeholder: '여행가조로 답글 달기',
    maxLength: 200,
  },
  decorators: [
    (Story) => (
      <div className="w-93.75">
        <Story />
      </div>
    ),
  ],
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <CommentComposer {...args} value={value} onValueChange={setValue} />;
  },
} satisfies Meta<CommentComposerProps>;

export default meta;

type Story = StoryObj<CommentComposerProps>;

/** Figma `Mode=Reply`(입력칸만) */
export const Comment: Story = {};

/** Figma `Mode=Comment`(답글 대상 줄 있음) */
export const Replying: Story = { args: { replyTarget: '수인', onCancelReply: () => {} } };

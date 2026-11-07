import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CommentInput } from './CommentInput';

const meta = {
  title: 'Web/Feed/CommentInput',
  component: CommentInput,
  args: {
    value: '',
    onValueChange: () => {},
    onSubmit: () => {},
    placeholder: '여행가조로 댓글 달기',
    maxLength: 200,
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
  // 입력값을 직접 바꿔 볼 수 있게 상태를 둠
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <CommentInput {...args} value={value} onValueChange={setValue} />;
  },
} satisfies Meta<typeof CommentInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `State=Default` */
export const Default: Story = {};

/** Figma `State=Filled` */
export const Filled: Story = { args: { value: '안녕하세요' } };

/** 여러 줄: 4줄까지 늘어나고 이후 스크롤 */
export const MultiLine: Story = {
  args: { value: '첫 줄\n둘째 줄\n셋째 줄\n넷째 줄\n다섯째 줄' },
};

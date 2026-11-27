import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloseButton } from './CloseButton';

const meta = {
  title: 'Admin/Button/CloseButton',
  component: CloseButton,
  args: { 'aria-label': '닫기' },
  // 흰 바탕 버튼이라 회색 배경 위에서 확인
  decorators: [
    (Story) => (
      <div className="bg-surface-secondary p-padding-p8 inline-flex">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CloseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default(Hover·Pressed는 마우스를 올리거나 눌러 확인) */
export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { FloatingButton } from './FloatingButton';

const meta = {
  title: 'Web/FloatingButton',
  component: FloatingButton,
  args: { 'aria-label': '더보기' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FloatingButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

/** 더하기 아이콘: 사진 추가처럼 새로 만드는 동작에 사용 */
export const Add: Story = { args: { icon: 'add', 'aria-label': '사진 추가' } };

/** 기본·비활성을 나란히 보기(눌림은 버튼을 눌러서 확인) */
export const States: Story = {
  render: () => (
    <div className="gap-s8 flex items-center">
      <FloatingButton aria-label="더보기" />
      <FloatingButton aria-label="더보기" disabled />
      <FloatingButton aria-label="사진 추가" icon="add" />
      <FloatingButton aria-label="사진 추가" icon="add" disabled />
    </div>
  ),
};

/** 화면 오른쪽 아래에 띄운 예: 위치는 호출하는 쪽이 className으로 정함 */
export const Floating: Story = {
  render: () => (
    <div className="bg-surface-secondary rounded-r4 relative h-60 w-85.75">
      <FloatingButton aria-label="더보기" className="absolute right-4 bottom-4" />
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeleteButton } from './DeleteButton';

const meta = {
  title: 'Web/DeleteButton',
  component: DeleteButton,
  args: { label: '삭제' },
} satisfies Meta<typeof DeleteButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = { args: { size: 'L' } };

// overlay는 사진 위에 얹는 용도라 사진 배경 위에서 확인
export const Overlay: Story = {
  args: { variant: 'overlay' },
  decorators: [
    (Story) => (
      <div className="bg-primitive-gray-400 p-s8">
        <Story />
      </div>
    ),
  ],
};

// Size M·L × Default·Overlay 네 가지 변형
export const Matrix: Story = {
  render: () => (
    <div className="gap-s8 p-s8 grid w-fit grid-cols-2 items-center justify-items-center">
      <DeleteButton label="삭제" size="M" variant="default" />
      <DeleteButton label="삭제" size="M" variant="overlay" />
      <DeleteButton label="삭제" size="L" variant="default" />
      <DeleteButton label="삭제" size="L" variant="overlay" />
    </div>
  ),
};

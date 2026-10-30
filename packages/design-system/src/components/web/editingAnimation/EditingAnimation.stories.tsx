import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditingAnimation } from './EditingAnimation';

const meta = {
  title: 'Web/EditingAnimation',
  component: EditingAnimation,
  args: { label: '편집 중' },
} satisfies Meta<typeof EditingAnimation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** label 없이 쓰는 장식 상태: 옆에 글자가 있을 때 */
export const WithText: Story = {
  render: () => (
    <div className="gap-s4 flex items-center">
      <EditingAnimation />
      <span className="typography-body-3-semi-bold">지금 함께 편집하고 있어요</span>
    </div>
  ),
};

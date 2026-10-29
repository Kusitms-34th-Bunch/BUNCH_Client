import type { Meta, StoryObj } from '@storybook/react-vite';
import { SelectionIndicator } from './SelectionIndicator';

const meta = {
  title: 'Web/SelectionIndicator',
  component: SelectionIndicator,
  args: { order: 1 },
  decorators: [
    (Story) => (
      <div className="bg-surface-inverse p-s8 w-fit">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectionIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotSelected: Story = {};

export const Selected: Story = { args: { selected: true } };

// Selected False·True와 두 자리 순서를 나란히(어두운 배경 위 흰 원)
export const Matrix: Story = {
  render: () => (
    <div className="gap-s8 flex">
      <SelectionIndicator />
      <SelectionIndicator selected order={1} />
      <SelectionIndicator selected order={12} />
    </div>
  ),
};

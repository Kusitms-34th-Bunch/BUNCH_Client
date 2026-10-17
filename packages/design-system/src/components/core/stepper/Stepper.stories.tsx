import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stepper } from './Stepper';

const meta = {
  title: 'Components/Stepper',
  component: Stepper,
  args: { total: 3, current: 1 },
  argTypes: {
    total: { control: { type: 'number', min: 1, max: 6 } },
    current: { control: { type: 'number', min: 1, max: 6 } },
  },
  decorators: [
    (Story) => (
      <div className="w-[343px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Stepper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Steps: Story = {
  render: (args) => (
    <div className="space-y-s8">
      {[1, 2, 3].map((current) => (
        <Stepper key={current} {...args} current={current} />
      ))}
    </div>
  ),
};

export const ManySteps: Story = { args: { total: 5, current: 3 } };

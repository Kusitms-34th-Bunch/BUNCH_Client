import type { Meta, StoryObj } from '@storybook/react-vite';
import { Option } from './Option';

const meta = {
  title: 'Web/Option',
  component: Option,
  argTypes: { variant: { control: 'inline-radio', options: ['required', 'optional'] } },
} satisfies Meta<typeof Option>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Required: Story = { args: { variant: 'required' } };

export const Optional: Story = { args: { variant: 'optional' } };

export const Both: Story = {
  render: () => (
    <div className="gap-s4 flex items-center">
      <Option variant="required" />
      <Option variant="optional" />
    </div>
  ),
};

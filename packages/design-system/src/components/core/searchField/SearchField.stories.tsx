import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchField } from './SearchField';

const meta = {
  title: 'Components/SearchField',
  component: SearchField,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

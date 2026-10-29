import type { Meta, StoryObj } from '@storybook/react-vite';
import { MenuDivider } from './MenuDivider';

const meta = {
  title: 'Web/MenuDivider',
  component: MenuDivider,
  decorators: [
    (Story) => (
      <div className="w-39">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuDivider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

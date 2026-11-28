import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchBar } from './SearchBar';

const meta = {
  title: 'Admin/Input/SearchBar',
  component: SearchBar,
  args: { 'aria-label': '장소명 검색', placeholder: '장소명을 검색해주세요.' },
  // Figma 폭 320px
  decorators: [
    (Story) => (
      <div className="bg-surface-secondary p-padding-p8 w-90">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default(누르면 Focused) */
export const Default: Story = {};

export const Filled: Story = { args: { defaultValue: '플로디' } };

export const Disabled: Story = { args: { disabled: true } };

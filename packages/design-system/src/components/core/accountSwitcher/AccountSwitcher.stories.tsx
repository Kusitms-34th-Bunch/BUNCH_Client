import type { Meta, StoryObj } from '@storybook/react-vite';
import { AccountSwitcher } from './AccountSwitcher';

const meta = {
  title: 'Components/AccountSwitcher',
  component: AccountSwitcher,
  args: { label: '계정 이름' },
} satisfies Meta<typeof AccountSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongLabel: Story = {
  args: { label: '아주아주아주아주 긴 계정 이름이 들어가는 경우' },
  decorators: [(Story) => <div style={{ width: 200 }}>{Story()}</div>],
};

export const Disabled: Story = {
  args: { disabled: true },
};

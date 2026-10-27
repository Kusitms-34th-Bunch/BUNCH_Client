import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineDownloadMediumIcon, LineTrashcanMediumIcon } from '../../../icons';
import { MenuItem } from './MenuItem';

const meta = {
  title: 'Web/MenuItem',
  component: MenuItem,
  args: { children: '저장' },
  decorators: [
    (Story) => (
      <div role="menu" aria-label="메뉴 항목 미리보기" className="w-43">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Warning: Story = { args: { tone: 'warning', children: '삭제' } };

export const WithIcon: Story = {
  args: { icon: <LineDownloadMediumIcon aria-hidden="true" /> },
};

export const WarningWithIcon: Story = {
  args: { tone: 'warning', children: '삭제', icon: <LineTrashcanMediumIcon aria-hidden="true" /> },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineDownloadMediumIcon, LineTrashcanMediumIcon } from '../../../icons';
import { MenuItem } from '../menuItem';
import { Menu } from './Menu';

const meta = {
  title: 'Web/Menu',
  component: Menu,
  args: { 'aria-label': '번들 메뉴' },
  render: (args) => (
    <Menu {...args}>
      <MenuItem>저장</MenuItem>
      <MenuItem>이름 바꾸기</MenuItem>
      <MenuItem tone="warning">삭제</MenuItem>
    </Menu>
  ),
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDivider: Story = { args: { showDivider: true } };

export const WithIcons: Story = {
  args: { showDivider: true },
  render: (args) => (
    <Menu {...args}>
      <MenuItem icon={<LineDownloadMediumIcon aria-hidden="true" />}>저장</MenuItem>
      <MenuItem tone="warning" icon={<LineTrashcanMediumIcon aria-hidden="true" />}>
        삭제
      </MenuItem>
    </Menu>
  ),
};

// Default·Warning × Icon 유무 매트릭스. 눌림은 항목을 누르는 동안 확인
export const Matrix: Story = {
  render: () => (
    <div className="gap-s8 flex">
      {[false, true].map((withIcon) => (
        <Menu
          className="shrink-0"
          key={String(withIcon)}
          aria-label={withIcon ? '아이콘 있음' : '아이콘 없음'}
          showDivider
        >
          <MenuItem icon={withIcon ? <LineDownloadMediumIcon aria-hidden="true" /> : undefined}>
            저장
          </MenuItem>
          <MenuItem
            tone="warning"
            icon={withIcon ? <LineTrashcanMediumIcon aria-hidden="true" /> : undefined}
          >
            삭제
          </MenuItem>
        </Menu>
      ))}
    </div>
  ),
};

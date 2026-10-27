import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  LineDownloadMediumIcon,
  LinePencilMediumIcon,
  LineTrashcanMediumIcon,
} from '../../../icons';
import { MenuDivider } from '../menuDivider';
import { MenuItem } from '../menuItem';
import { Menu } from './Menu';

const meta = {
  title: 'Web/Menu',
  component: Menu,
  args: { 'aria-label': '번들 메뉴' },
  render: (args) => (
    <Menu {...args}>
      <MenuItem>저장</MenuItem>
      <MenuItem>번들 만들기</MenuItem>
      <MenuItem>날짜 바꾸기</MenuItem>
      <MenuItem tone="warning">삭제</MenuItem>
    </Menu>
  ),
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Figma 시안처럼 삭제 항목 앞에만 구분선
export const WithDivider: Story = {
  render: (args) => (
    <Menu {...args}>
      <MenuItem>저장</MenuItem>
      <MenuItem>번들 만들기</MenuItem>
      <MenuItem>날짜 바꾸기</MenuItem>
      <MenuDivider />
      <MenuItem tone="warning">삭제</MenuItem>
    </Menu>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <Menu {...args}>
      <MenuItem icon={<LineDownloadMediumIcon aria-hidden="true" />}>저장</MenuItem>
      <MenuItem icon={<LinePencilMediumIcon aria-hidden="true" />}>번들 만들기</MenuItem>
      <MenuDivider />
      <MenuItem tone="warning" icon={<LineTrashcanMediumIcon aria-hidden="true" />}>
        삭제
      </MenuItem>
    </Menu>
  ),
};

// 아이콘 유무 × Default·Warning. 눌림은 항목을 누르는 동안 확인
export const Matrix: Story = {
  render: () => (
    <div className="gap-s8 flex">
      {[false, true].map((withIcon) => (
        <Menu
          className="shrink-0"
          key={String(withIcon)}
          aria-label={withIcon ? '아이콘 있음' : '아이콘 없음'}
        >
          <MenuItem icon={withIcon ? <LineDownloadMediumIcon aria-hidden="true" /> : undefined}>
            저장
          </MenuItem>
          <MenuDivider />
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

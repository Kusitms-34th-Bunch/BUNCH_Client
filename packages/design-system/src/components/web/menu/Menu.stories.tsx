import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import {
  LineDownloadMediumIcon,
  LinePencilMediumIcon,
  LineTrashcanMediumIcon,
} from '../../../icons';
import { Button } from '../../core/button';
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

const PopoverDemo = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <div className="gap-s4 flex flex-col items-start">
      <Button
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        ref={triggerRef}
        onClick={() => {
          // 닫히는 동안 메뉴는 inert라 안에 있던 포커스가 사라지므로, 닫기 전에 트리거로 돌려 놓음
          if (open) triggerRef.current?.focus();
          setMounted(true);
          setOpen((prev) => !prev);
        }}
      >
        {open ? '메뉴 닫기' : '메뉴 열기'}
      </Button>
      {mounted ? (
        <Menu aria-label="번들 메뉴" open={open} onExited={() => setMounted(false)}>
          <MenuItem>저장</MenuItem>
          <MenuItem>번들 만들기</MenuItem>
          <MenuItem>날짜 바꾸기</MenuItem>
          <MenuDivider />
          <MenuItem tone="warning">삭제</MenuItem>
        </Menu>
      ) : null}
    </div>
  );
};

// 열기·닫기 모션 확인용(Figma 팝오버 메뉴 모션: 400ms, 38px 이동 + 투명도). 닫히는 모션이 끝나면 `onExited`로 화면에서 뺌
export const PopoverMotion: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: () => <PopoverDemo />,
};

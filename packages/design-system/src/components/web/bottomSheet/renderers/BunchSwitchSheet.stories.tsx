import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { BunchSwitchSheet, type BunchSwitchItem } from './BunchSwitchSheet';

const bunches: BunchSwitchItem[] = [
  { id: '1', name: '퇴근런클럽', status: 'current' },
  { id: '2', name: '여행가조', notificationCount: 5 },
  { id: '3', name: '큐시즘 기프', notificationCount: 5 },
  { id: '4', name: '홍대 먹짱', status: 'unavailable' },
  { id: '5', name: '큐시즘 밋업', status: 'unavailable' },
];
const meta = {
  title: 'Web/BottomSheet/BunchSwitchSheet',
  component: BunchSwitchSheet,
  parameters: { layout: 'fullscreen' },
  // Figma처럼 모바일 폭의 앱 화면 위로 시트가 올라오는 모습
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  decorators: [
    (Story) => (
      <SheetStoryScreen>
        <Story />
      </SheetStoryScreen>
    ),
  ],
  args: { open: true, onOpenChange: () => {}, bunches, onSelect: () => {}, onAdd: () => {} },
  render: function Render(args) {
    const [open, setOpen] = useState(args.open);
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          번치 전환
        </Button>
        <BunchSwitchSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          onSelect={() => setOpen(false)}
        />
      </>
    );
  },
} satisfies Meta<typeof BunchSwitchSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 04 배치: 현재 번치·알림·접근 불가 */
export const Default: Story = {};

/** 번치가 많으면 목록만 스크롤 */
export const ManyBunches: Story = {
  args: {
    bunches: Array.from({ length: 14 }, (_, index) => ({
      id: String(index),
      name: `번치 ${index + 1}`,
      notificationCount: index % 3,
    })),
  },
};

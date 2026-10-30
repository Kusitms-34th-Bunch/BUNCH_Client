import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../../../core/button';
import { MoreMenuSheet } from './MoreMenuSheet';

const meta = {
  title: 'Web/BottomSheet/MoreMenuSheet',
  component: MoreMenuSheet,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onOpenChange: () => {}, items: [] },
  render: function Render(args) {
    const [open, setOpen] = useState(args.open);
    const close = () => setOpen(false);
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          더보기
        </Button>
        <MoreMenuSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          items={[
            { id: 'block', label: '차단하기', onSelect: close },
            { id: 'report', label: '신고하기', onSelect: close },
          ]}
        />
      </>
    );
  },
} satisfies Meta<typeof MoreMenuSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 06: 차단하기·신고하기 + 취소하기 */
export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { PhotoImportSheet } from './PhotoImportSheet';

const meta = {
  title: 'Web/Overlay/BottomSheet/PhotoImportSheet',
  component: PhotoImportSheet,
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
  args: {
    open: true,
    onOpenChange: () => {},
    onSelectBunchBox: () => {},
    onSelectGallery: () => {},
  },
  render: function Render(args) {
    const [open, setOpen] = useState(args.open);
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          시트 열기
        </Button>
        <PhotoImportSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          onSelectBunchBox={() => setOpen(false)}
          onSelectGallery={() => setOpen(false)}
        />
      </>
    );
  },
} satisfies Meta<typeof PhotoImportSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

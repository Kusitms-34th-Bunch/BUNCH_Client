import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { PhotoUploadSheet } from './PhotoUploadSheet';
const meta = {
  title: 'Web/BottomSheet/PhotoUploadSheet',
  component: PhotoUploadSheet,
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
    title: '퇴근런클럽에 사진 올리기',
    onSelectAlbum: () => {},
    onTakePhoto: () => {},
  },
  render: function Render(args) {
    const [open, setOpen] = useState(args.open);
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          시트 열기
        </Button>
        <PhotoUploadSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          onSelectAlbum={() => setOpen(false)}
          onTakePhoto={() => setOpen(false)}
        />
      </>
    );
  },
} satisfies Meta<typeof PhotoUploadSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 긴 번치 이름은 단어 단위 줄바꿈 */
export const LongTitle: Story = {
  args: { title: '주말마다 한강에서 달리는 사람들의 모임에 사진 올리기' },
};

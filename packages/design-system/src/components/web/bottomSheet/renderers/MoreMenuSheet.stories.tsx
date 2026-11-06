import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { MoreMenuSheet } from './MoreMenuSheet';
const meta = {
  title: 'Web/Overlay/BottomSheet/MoreMenuSheet',
  component: MoreMenuSheet,
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
  args: { open: true, onOpenChange: () => {}, items: [] },
  render: function Render(args) {
    // Controls의 open과 시트 열림을 같은 값으로(초기값 복사가 아님)
    const [{ open }, updateArgs] = useArgs<typeof args>();
    const setOpen = (nextOpen: boolean) => updateArgs({ open: nextOpen });
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

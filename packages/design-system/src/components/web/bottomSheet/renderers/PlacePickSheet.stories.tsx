import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { PlacePickSheet } from './PlacePickSheet';

const meta = {
  title: 'Web/Overlay/BottomSheet/PlacePickSheet',
  component: PlacePickSheet,
  parameters: { layout: 'fullscreen' },
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
    onPick: () => {},
    places: [
      { id: 'a', name: '애월 한담해변', address: '제주 제주시 애월읍', picked: false },
      { id: 'b', name: '한라산', address: '제주 서귀포시 토평동', picked: true },
    ],
  },
  render: function Render(args) {
    const [{ open }, updateArgs] = useArgs<typeof args>();
    const setOpen = (nextOpen: boolean) => updateArgs({ open: nextOpen });
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          시트 열기
        </Button>
        <PlacePickSheet {...args} open={open} onOpenChange={setOpen} />
      </>
    );
  },
} satisfies Meta<typeof PlacePickSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 위치가 하나여도 같은 시트 */
export const SinglePlace: Story = {
  args: {
    places: [{ id: 'a', name: '애월 한담해변', address: '제주 제주시 애월읍', picked: false }],
  },
};

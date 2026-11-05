import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { PinnedPlaceSheet } from './PinnedPlaceSheet';
const meta = {
  title: 'Web/Overlay/BottomSheet/PinnedPlaceSheet',
  component: PinnedPlaceSheet,
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
    placeName: '봄날카페',
    address: '제주 제주시 애월읍',
    onViewBundles: () => {},
    onCopyAddress: () => {},
    onRemove: () => {},
  },
  render: function Render(args) {
    // Controls의 open과 시트 열림을 같은 값으로(초기값 복사가 아님)
    const [{ open }, updateArgs] = useArgs<typeof args>();
    const setOpen = (nextOpen: boolean) => updateArgs({ open: nextOpen });
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          콕한 장소
        </Button>
        <PinnedPlaceSheet {...args} open={open} onOpenChange={setOpen} />
      </>
    );
  },
} satisfies Meta<typeof PinnedPlaceSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 09: 사진 자리가 회색인 기본 모습 */
export const Default: Story = {};

/** 긴 장소 이름·주소는 한 줄 말줄임 */
export const LongText: Story = {
  args: {
    placeName: '제주 애월 바다가 보이는 아주 긴 이름의 봄날카페 본점',
    address: '제주특별자치도 제주시 애월읍 애월해안로 아주 긴 주소 1234-56',
  },
};

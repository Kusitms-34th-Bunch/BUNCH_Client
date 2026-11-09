import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { PlaceSearchSheet } from './PlaceSearchSheet';

const meta = {
  title: 'Web/Overlay/BottomSheet/PlaceSearchSheet',
  component: PlaceSearchSheet,
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
    title: '위치 검색',
    inputLabel: '장소 검색',
    placeholder: '장소나 주소를 검색해 주세요',
    guideTitle: '태그한 위치는 함께 보여요',
    guideDescription: '게시글에 태그한 위치는 해당 게시글을 보는 다른 사람들에게도 표시돼요.',
    noResultLabel: '검색 결과가 없어요',
    resultCountLabel: (count: number) => `검색 결과 ${count}개`,
    results: undefined,
    onSearch: () => {},
    onSelect: () => {},
  },
  render: function Render(args) {
    const [{ open }, updateArgs] = useArgs<typeof args>();
    const setOpen = (nextOpen: boolean) => updateArgs({ open: nextOpen });
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          시트 열기
        </Button>
        <PlaceSearchSheet {...args} open={open} onOpenChange={setOpen} />
      </>
    );
  },
} satisfies Meta<typeof PlaceSearchSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 검색 전 안내 */
export const Default: Story = {};

export const WithResults: Story = {
  args: {
    results: [
      { id: 'a', name: '여의도한강공원', address: '서울특별시 영등포구 여의동로 330' },
      { id: 'b', name: 'IFC몰', address: '서울특별시 영등포구 국제금융로 10' },
    ],
  },
};

export const NoResult: Story = { args: { results: [] } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { AdminTransferSheet } from './AdminTransferSheet';
const meta = {
  title: 'Web/BottomSheet/AdminTransferSheet',
  component: AdminTransferSheet,
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
    memberName: '경진',
    onConfirm: () => {},
    // Figma 자리표시(92px 회색 상자). 실제 일러스트 에셋 전달 전 임시
    illustration: <div className="bg-surface-tertiary size-full" />,
  },
  render: function Render(args) {
    // Controls의 open과 시트 열림을 같은 값으로(초기값 복사가 아님)
    const [{ open }, updateArgs] = useArgs<typeof args>();
    const setOpen = (nextOpen: boolean) => updateArgs({ open: nextOpen });
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          관리자 지정하고 나가기
        </Button>
        <AdminTransferSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  },
} satisfies Meta<typeof AdminTransferSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutIllustration: Story = { args: { illustration: undefined } };
export const Confirming: Story = { args: { confirming: true } };

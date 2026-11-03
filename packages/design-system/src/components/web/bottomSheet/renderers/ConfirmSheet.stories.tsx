import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { ConfirmSheet } from './ConfirmSheet';
const meta = {
  title: 'Web/Overlay/BottomSheet/ConfirmSheet',
  component: ConfirmSheet,
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
    title: '여행가조 번치를 차단할까요?',
    notice: '차단하면 번치의 모든 멤버가\n서로의 활동을 볼 수 없어요.',
    confirmLabel: '차단하기',
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
          번치 차단하기
        </Button>
        <ConfirmSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  },
} satisfies Meta<typeof ConfirmSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 05: 그림·제목·안내 상자(번치 차단 확인) */
export const Default: Story = {};
/** 부제가 있는 모습(관리자 지정 확인과 같은 구성) */
export const WithDescription: Story = {
  args: {
    title: '경진님을 관리자로 지정하고 나갈까요?',
    description: '경진님이 번치 관리와 번들 발행 권한을 갖게 돼요.',
    confirmLabel: '지정하고 나가기',
  },
};
export const WithoutIllustration: Story = { args: { illustration: undefined } };
export const Confirming: Story = { args: { confirming: true } };

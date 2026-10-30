import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { DateChangeSheet } from './DateChangeSheet';
const meta = {
  title: 'Web/BottomSheet/DateChangeSheet',
  component: DateChangeSheet,
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
  args: { open: true, onOpenChange: () => {}, onSave: () => {} },
  render: function Render(args) {
    const [open, setOpen] = useState(args.open);
    const [saved, setSaved] = useState<string | null>(null);
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          날짜 바꾸기
        </Button>
        {saved ? <p className="p-padding-p8">저장한 날짜: {saved}</p> : null}
        <DateChangeSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          onSave={(date) => {
            setSaved(date.toLocaleDateString('ko-KR'));
            setOpen(false);
          }}
        />
      </>
    );
  },
} satisfies Meta<typeof DateChangeSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 열 때마다 오늘 달·선택 없음, 오늘 이후 선택 불가 */
export const Default: Story = {};

/** 처음 선택 상태를 화면이 정함: 사진 상세는 사진의 촬영 날짜를 고른 채 그 달로 열고, 다른 날짜를 고르면 「저장」이 켜짐 */
export const WithDefaultDate: Story = { args: { defaultDate: new Date(2026, 8, 5) } };

/** 저장 중: 날짜를 골라도 「저장」 비활성 */
export const Saving: Story = { args: { saving: true } };

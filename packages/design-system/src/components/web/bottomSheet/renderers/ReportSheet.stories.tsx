import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { ReportSheet } from './ReportSheet';

const reasons = ['스팸', '음란・부적절한 내용', '괴롭힘・욕설', '개인정보 노출', '기타'].map(
  (label) => ({ value: label, label }),
);
const meta = {
  title: 'Web/BottomSheet/ReportSheet',
  component: ReportSheet,
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
    title: '여행가조 번치를 신고해요',
    targetLabel: '신고하는 번치',
    targetName: '퇴근런클럽',
    reasons,
    onSubmit: () => {},
  },
  render: function Render(args) {
    const [open, setOpen] = useState(args.open);
    return (
      <>
        <Button size="md" onClick={() => setOpen(true)}>
          신고하기
        </Button>
        <ReportSheet {...args} open={open} onOpenChange={setOpen} onSubmit={() => setOpen(false)} />
      </>
    );
  },
} satisfies Meta<typeof ReportSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 07: 「기타」 선택 시 상세 사유 입력 */
export const WithDetail: Story = { args: { detailReasonValue: '기타' } };

/** Figma 08: 상세 사유 입력 없음 */
export const ReasonOnly: Story = {};

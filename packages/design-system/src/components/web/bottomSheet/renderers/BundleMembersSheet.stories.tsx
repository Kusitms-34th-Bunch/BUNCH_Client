import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Button } from '../../../core/button';
import { SheetStoryScreen } from '../SheetStoryScreen.internal';
import { BundleMembersSheet, type BundleMemberLinkState } from './BundleMembersSheet';

const storyLink = ({ className, children }: BundleMemberLinkState) => (
  <a href="#member" className={className}>
    {children}
  </a>
);

const meta = {
  title: 'Web/Overlay/BottomSheet/BundleMembersSheet',
  component: BundleMembersSheet,
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
    members: [
      { name: '은우링링링', memberRole: 'owner', roleLabel: '메인 관리자', renderLink: storyLink },
      { name: '경진', renderLink: storyLink },
      { name: '작성자' },
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
        <BundleMembersSheet {...args} open={open} onOpenChange={setOpen} />
      </>
    );
  },
} satisfies Meta<typeof BundleMembersSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 멤버가 많으면 본문만 스크롤 */
export const ManyMembers: Story = {
  args: {
    members: Array.from({ length: 12 }, (_, index) => ({
      name: `멤버 ${index + 1}`,
      renderLink: storyLink,
    })),
  },
};

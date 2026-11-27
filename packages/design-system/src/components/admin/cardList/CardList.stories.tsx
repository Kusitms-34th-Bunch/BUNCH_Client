import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardList } from './CardList';

const meta = {
  title: 'Admin/Card/CardList',
  component: CardList,
  args: {
    title: '“팔로우 걸고 DM으로 부업 권유해요.”',
    meta: ['스팸', '퇴근런클럽 (신고자: 민수)', '10.31 22:15'],
  },
  // Figma 폭 596px
  decorators: [
    (Story) => (
      <div className="w-149">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CardList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutMeta: Story = { args: { meta: undefined } };

/** 긴 본문은 줄바꿈 */
export const LongTitle: Story = {
  args: {
    title:
      '“번치 소개란에 외부 링크를 계속 올리면서 부업을 권유하고, 댓글로도 같은 내용을 반복해서 남기고 있어요.”',
  },
};

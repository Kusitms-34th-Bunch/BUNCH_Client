import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorBadge } from '../../core/colorBadge';
import { AdminHeader } from './AdminHeader';

const noop = () => {};

const meta = {
  title: 'Admin/Navigation/AdminHeader',
  component: AdminHeader,
  args: {
    title: '플로디스튜디오',
    code: '#S-0012',
    badge: (
      <ColorBadge variant="weak" color="brand">
        노출중
      </ColorBadge>
    ),
    back: { onClick: noop, label: '목록으로' },
    close: { onClick: noop, label: '닫기' },
  },
  // Figma 상세 패널 폭 660px
  decorators: [
    (Story) => (
      <div className="bg-surface-primary w-165">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 기본: 뒤로 가기·제목·코드·배지·닫기 */
export const Default: Story = {};

/** 상세 패널 첫 화면: 뒤로 가기 없이 닫기만 */
export const CloseOnly: Story = { args: { back: undefined } };

export const TitleOnly: Story = {
  args: { code: undefined, badge: undefined, back: undefined, close: undefined },
};

/** 긴 제목은 한 줄 말줄임, 코드·배지·닫기는 줄지 않음 */
export const LongTitle: Story = {
  args: { title: '성수동 소규모 원데이 베이킹 클래스와 프라이빗 파티룸' },
};

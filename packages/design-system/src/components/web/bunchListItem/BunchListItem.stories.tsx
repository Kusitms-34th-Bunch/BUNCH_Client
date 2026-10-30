import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorBadge } from '../colorBadge';
import { BunchListItem } from './BunchListItem';

const meta = {
  title: 'Web/BunchListItem',
  component: BunchListItem,
  args: { name: '여행가조' },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof BunchListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithBadge: Story = {
  args: {
    badge: (
      <ColorBadge color="pink" size="md">
        알림 5개
      </ColorBadge>
    ),
  },
};

/** 지금 보고 있는 번치: 흐림·선택 불가 */
export const Current: Story = { args: { name: '퇴근런클럽', status: 'current' } };

/** 접근 불가: 흐림·이름 disabled 색, 표시는 오른쪽 끝 */
export const Unavailable: Story = {
  args: {
    name: '홍대 먹짱',
    status: 'unavailable',
    badge: (
      <ColorBadge color="gray" size="md">
        접근 불가
      </ColorBadge>
    ),
  },
};

export const LongName: Story = {
  args: { name: '주말마다 한강에서 달리는 사람들의 모임' },
};

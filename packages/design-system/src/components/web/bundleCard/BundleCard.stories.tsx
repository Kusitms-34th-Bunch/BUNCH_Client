import type { Meta, StoryObj } from '@storybook/react-vite';
import { BundleCard } from './BundleCard';

const PHOTO =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="80"><rect width="128" height="80" fill="%23a7adff"/></svg>';

const members = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버${index + 1}` }));

const meta = {
  title: 'Web/Card/BundleCard',
  component: BundleCard,
  args: {
    title: '머그샷',
    imageSrc: PHOTO,
    members: members(8),
    onCardClick: () => {},
    onDelete: () => {},
  },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof BundleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma `Bundle_Card_List`: 사진·이름·참여자 8명·삭제. 카드를 누르고 있으면 overlay-hover가 겹침 */
export const Default: Story = {};

/** 참여자가 8명을 넘으면 앞 8명만 얼굴 표시, 전체 인원은 숨은 글자로 전달 */
export const ManyMembers: Story = { args: { members: members(12) } };

export const FewMembers: Story = { args: { members: members(2) } };

/** 삭제할 수 없는 번들: `onDelete` 없음 */
export const WithoutDelete: Story = {
  render: ({ onDelete: _onDelete, ...args }) => <BundleCard {...args} />,
};

/** 긴 이름은 한 줄 말줄임 */
export const LongTitle: Story = {
  args: { title: '퇴근 후 한강 러닝 클럽 첫 번째 정기 모임 단체 사진 모음' },
};

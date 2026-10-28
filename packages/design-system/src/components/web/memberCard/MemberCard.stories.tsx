import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddMemberCard } from '../addMemberCard';
import { MemberCard } from './MemberCard';

/** 예시 프로필 사진(연한 하늘색 배경의 원) */
const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#d9ecf5"/><circle cx="40" cy="34" r="16" fill="#f4f8fb"/><ellipse cx="40" cy="74" rx="26" ry="20" fill="#f4f8fb"/></svg>',
)}`;

const meta = {
  title: 'Web/MemberCard',
  component: MemberCard,
  args: { name: '지예', src: SAMPLE_IMAGE },
} satisfies Meta<typeof MemberCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Variant=default, Delete=False`: 역할 배지 없이 사진과 이름 */
export const Default: Story = {};

/** 역할 배지(번치장 왕관)가 이름 앞에 붙음 */
export const WithRoleBadge: Story = { args: { memberRole: 'owner', roleLabel: '번치장' } };

/** Figma `Variant=default, Delete=True`: 오른쪽 위에 삭제 버튼 */
export const Deletable: Story = { args: { memberRole: 'owner', onDelete: () => {} } };

/** 긴 이름은 한 줄로 줄임 */
export const LongName: Story = { args: { name: '아주긴이름의멤버', memberRole: 'owner' } };

/** Figma `Member Card` 세 변형 나란히 보기 */
export const Variants: Story = {
  render: (args) => (
    <div className="gap-s6 p-s6 flex items-start">
      <MemberCard {...args} memberRole="owner" onDelete={() => {}} />
      <MemberCard {...args} memberRole="owner" />
      <AddMemberCard />
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioCard } from './RadioCard';

const meta = {
  title: 'Web/Selection/RadioCard',
  component: RadioCard,
  args: {
    name: 'visibility',
    title: '전체 공개',
    description: '번치의 모든 사용자가 볼 수 있어요',
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-85.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

/** 긴 글자: 줄바꿈하고 카드 높이가 늘어남 */
export const LongLabel: Story = {
  args: {
    title: '친구들과 함께 보는 아주 긴 공개 범위 이름입니다 친구들과 함께 보는 공개 범위',
    description: '우리 번치를 팔로우한 번치도 볼 수 있고 번치의 모든 사용자에게 보일 수도 있어요',
  },
};

/** 같은 name의 카드를 fieldset·legend로 묶은 그룹(Hover·눌림은 포인터를 올려 확인) */
export const Group: Story = {
  render: () => (
    <fieldset className="gap-s2 flex flex-col">
      <legend className="typography-body-3-semibold pb-s4">공개 범위</legend>
      <RadioCard
        name="visibility"
        value="public"
        title="전체 공개"
        description="번치의 모든 사용자가 볼 수 있어요"
        defaultChecked
      />
      <RadioCard
        name="visibility"
        value="members"
        title="멤버 공개"
        description="우리 번치 멤버만 볼 수 있어요"
      />
    </fieldset>
  ),
};

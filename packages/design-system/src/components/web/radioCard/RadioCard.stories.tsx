import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioCard } from './RadioCard';

const meta = {
  title: 'Web/RadioCard',
  component: RadioCard,
  args: { name: 'visibility', children: '비공개' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-[167px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

/** 167px 폭에서 긴 글자: 한 줄 말줄임 */
export const LongLabel: Story = {
  args: { children: '친구들과 함께 보는 아주 긴 공개 범위 이름' },
};

/** 같은 name의 카드를 fieldset·legend로 묶은 그룹(Hover·눌림은 포인터를 올려 확인) */
export const Group: Story = {
  render: () => (
    <fieldset className="gap-s4 flex flex-col">
      <legend className="typography-body-3-semi-bold pb-s4">공개 범위</legend>
      <RadioCard name="visibility" value="private" defaultChecked>
        비공개
      </RadioCard>
      <RadioCard name="visibility" value="public">
        전체 공개
      </RadioCard>
    </fieldset>
  ),
};

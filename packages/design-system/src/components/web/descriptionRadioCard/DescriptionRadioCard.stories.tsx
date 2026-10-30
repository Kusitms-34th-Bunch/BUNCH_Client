import type { Meta, StoryObj } from '@storybook/react-vite';
import { DescriptionRadioCard } from './DescriptionRadioCard';

const meta = {
  title: 'Web/DescriptionRadioCard',
  component: DescriptionRadioCard,
  args: {
    title: '공개',
    description: '누구나 우리 번치와 번들을 볼 수 있어요.',
    name: 'visibility',
    value: 'public',
  },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof DescriptionRadioCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 누르고 있으면 바탕에 눌림 겹침 */
export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Group: Story = {
  render: () => (
    <fieldset className="gap-s4 flex flex-col">
      <legend className="sr-only">공개 범위</legend>
      <DescriptionRadioCard
        title="공개"
        description="누구나 우리 번치와 번들을 볼 수 있어요."
        name="scope"
        value="public"
        defaultChecked
      />
      <DescriptionRadioCard
        title="비공개"
        description="번치 멤버만 볼 수 있어요."
        name="scope"
        value="private"
      />
    </fieldset>
  ),
};

export const NoDescription: Story = { args: { description: undefined } };

/** 긴 글과 공백 없는 긴 토큰도 카드 안에서 줄바꿈 */
export const LongText: Story = {
  args: {
    title: '번치 멤버와 초대받은 사람까지 볼 수 있는 범위',
    description: 'https://bunch.example.com/invite/averyveryverylongtokenwithoutanyspaces',
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProfileRadioCard } from './ProfileRadioCard';

const meta = {
  title: 'Web/ProfileRadioCard',
  component: ProfileRadioCard,
  args: { label: '경진', name: 'member', value: '1' },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof ProfileRadioCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 누르고 있으면 바탕·이미지에 눌림 겹침 */
export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

/** 관리자 지정처럼 멤버 중 한 명 고르기 */
export const Group: Story = {
  render: () => (
    <fieldset className="gap-s4 flex flex-col">
      <legend className="sr-only">관리자로 지정할 멤버</legend>
      {['경진', '은우', '하율'].map((member, index) => (
        <ProfileRadioCard key={member} label={member} name="admin" value={String(index)} />
      ))}
    </fieldset>
  ),
};

/** 긴 이름은 말줄임, 라디오는 유지 */
export const LongName: Story = {
  args: { label: '아주아주아주아주아주긴이름을가진멤버입니다요' },
};

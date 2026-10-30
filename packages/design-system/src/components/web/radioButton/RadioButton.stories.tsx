import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioButton } from './RadioButton';

const meta = {
  title: 'Web/RadioButton',
  component: RadioButton,
  args: { children: '스팸', name: 'story' },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof RadioButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { defaultChecked: true, children: '기타' } };
export const Disabled: Story = { args: { disabled: true } };

/** Figma 신고 사유 목록 배치(간격 4px) */
export const Group: Story = {
  render: () => (
    <fieldset className="gap-s2 flex flex-col">
      <legend className="sr-only">신고 사유</legend>
      {['스팸', '음란・부적절한 내용', '괴롭힘・욕설', '개인정보 노출', '기타'].map((reason) => (
        <RadioButton key={reason} name="reason" value={reason} defaultChecked={reason === '기타'}>
          {reason}
        </RadioButton>
      ))}
    </fieldset>
  ),
};

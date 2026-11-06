import type { Meta, StoryObj } from '@storybook/react-vite';
import { BunchRadioItem } from './BunchRadioItem';

const meta = {
  title: 'Web/Selection/BunchRadioItem',
  component: BunchRadioItem,
  args: { label: '퇴근런클럽', name: 'bunch', value: '1', alertCount: 5 },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof BunchRadioItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma `Status=Default`. 누르고 있으면 회색 바탕 */
export const Default: Story = {};

/** Figma `Status=Pressed`를 선택됨으로 사용: 회색 바탕과 체크 */
export const Checked: Story = { args: { defaultChecked: true } };

/** Figma `Status=Disabled`: 흐림(40%), 선택 불가 */
export const Disabled: Story = { args: { disabled: true } };

export const WithoutAlert: Story = { args: { alertCount: 0 } };

/** 번치 목록에서 하나 고르기: 같은 name으로 묶고 fieldset·legend로 그룹 이름 제공 */
export const Group: Story = {
  render: () => (
    <fieldset className="gap-s2 flex flex-col">
      <legend className="sr-only">번치 선택</legend>
      <BunchRadioItem label="퇴근런클럽" name="group" value="1" alertCount={5} defaultChecked />
      <BunchRadioItem label="야간러너스" name="group" value="2" />
      <BunchRadioItem
        label="아주아주긴이름을가진번치입니다아주아주"
        name="group"
        value="3"
        alertCount={12}
      />
    </fieldset>
  ),
};

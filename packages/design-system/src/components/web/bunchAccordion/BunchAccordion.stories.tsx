import type { Meta, StoryObj } from '@storybook/react-vite';
import { BunchAccordion } from './BunchAccordion';

// 펼친 안쪽 예시: 실제 멤버 목록은 화면이 넣음
const Members = () => (
  <ul className="px-padding-p5 pb-s4 typography-body-2-medium text-text-secondary m-0 list-none">
    {['지예', '서현', '재현'].map((member) => (
      <li key={member} className="py-s4">
        {member}
      </li>
    ))}
  </ul>
);

const meta = {
  title: 'Web/ListItem/BunchAccordion',
  component: BunchAccordion,
  args: { name: '퇴근런클럽', children: <Members /> },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BunchAccordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

export const Disabled: Story = { args: { disabled: true } };

/** Figma `Status=Selected`: 안에서 고른 뒤 접힌 상태. 펼치면 기본 모양으로 돌아감 */
export const Selected: Story = { args: { selected: true, selectedLabel: '새 관리자: 서현' } };

export const LongName: Story = {
  args: { name: '퇴근하고 한강까지 같이 달리는 아주 긴 이름의 러닝 모임' },
};

/** 탈퇴 화면처럼 여러 번치를 세로로 쌓은 예 */
export const List: Story = {
  render: (args) => (
    <div className="gap-s4 flex flex-col">
      <BunchAccordion {...args} defaultOpen />
      <BunchAccordion {...args} name="야르릉모임" />
      <BunchAccordion {...args} name="홍대먹짱" />
    </div>
  ),
};

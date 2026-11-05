import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { 'aria-label': '전체 선택' },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

/** Figma 상태 한눈에 보기(Pressed는 누르는 동안만 보여 정지 화면에 없음) */
export const States: Story = {
  render: () => (
    <div className="gap-s6 flex items-center">
      <Checkbox aria-label="비활성" disabled />
      <Checkbox aria-label="기본" />
      <Checkbox aria-label="선택됨" defaultChecked />
    </div>
  ),
};

/** 글자와 함께 쓰는 예: label을 연결해 이름을 주고 누르는 영역을 넓힘 */
export const WithLabel: Story = {
  render: () => (
    <div className="gap-s3 typography-body-3-regular flex items-center">
      <Checkbox id="select-all" />
      <label htmlFor="select-all">사진 모두 선택</label>
    </div>
  ),
};

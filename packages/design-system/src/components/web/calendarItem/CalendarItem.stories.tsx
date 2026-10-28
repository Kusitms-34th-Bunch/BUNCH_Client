import type { Meta, StoryObj } from '@storybook/react-vite';
import { CalendarItem } from './CalendarItem';

const meta = {
  title: 'Web/CalendarItem',
  component: CalendarItem,
  args: { children: '4' },
} satisfies Meta<typeof CalendarItem>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `State=Active` */
export const Default: Story = {};

/** Figma `State=Selected` */
export const Selected: Story = { args: { selected: true } };

/** Figma `State=Disabled`: 포커스는 받지만 눌러도 동작하지 않음 */
export const Disabled: Story = { args: { disabled: true } };

/** Figma `State=hidden`: 보이지 않고 칸만 차지 */
export const Hidden: Story = { args: { hidden: true } };

/** 다섯 상태 나란히 보기(Pressed는 날짜를 누른 채로 확인) */
export const States: Story = {
  render: () => (
    <div className="gap-s6 flex items-center">
      <CalendarItem>4</CalendarItem>
      <CalendarItem selected>4</CalendarItem>
      <CalendarItem disabled>4</CalendarItem>
      <CalendarItem hidden>4</CalendarItem>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { PaginationIndicatorItem } from './PaginationIndicatorItem';

const meta = {
  title: 'Web/PaginationIndicatorItem',
  component: PaginationIndicatorItem,
} satisfies Meta<typeof PaginationIndicatorItem>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `State=Active`: 현재 페이지, 6px */
export const Active: Story = { args: { state: 'active' } };

/** Figma `State=Middle`: 가까운 페이지, 6px */
export const Middle: Story = { args: { state: 'middle' } };

/** Figma `State=Far`: 멀리 있는 페이지, 4px */
export const Far: Story = { args: { state: 'far' } };

/** 세 상태를 4px 간격으로 나란히 보기 */
export const States: Story = {
  render: () => (
    <div className="gap-s2 flex items-center">
      <PaginationIndicatorItem state="active" />
      <PaginationIndicatorItem state="middle" />
      <PaginationIndicatorItem state="far" />
    </div>
  ),
};

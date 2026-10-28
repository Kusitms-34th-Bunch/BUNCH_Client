import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddMemberCard } from './AddMemberCard';

const meta = {
  title: 'Web/AddMemberCard',
  component: AddMemberCard,
} satisfies Meta<typeof AddMemberCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Member Card`의 `Variant=add` */
export const Default: Story = {};

/** 글자를 바꾸기 */
export const CustomLabel: Story = { args: { label: '멤버 추가' } };

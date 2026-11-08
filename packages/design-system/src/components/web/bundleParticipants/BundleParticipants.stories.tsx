import type { Meta, StoryObj } from '@storybook/react-vite';
import { BundleParticipants } from './BundleParticipants';

const members = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버${index + 1}` }));

const meta = {
  title: 'Web/Feed/BundleParticipants',
  component: BundleParticipants,
  args: { members: members(7), onClick: () => {} },
} satisfies Meta<typeof BundleParticipants>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 3명 + 「외 4명」 */
export const Default: Story = {};

/** 3명 이하면 「외 N명」 없음 */
export const ThreeOrLess: Story = { args: { members: members(2) } };

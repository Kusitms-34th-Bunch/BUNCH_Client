import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from './Toggle';

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  args: { 'aria-label': '앱 푸시 알림' },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

/** Figma 4상태(비활성·기본 × 꺼짐·켜짐) */
export const States: Story = {
  render: () => (
    <div className="gap-s6 grid grid-cols-2 justify-items-start">
      <Toggle aria-label="비활성 꺼짐" disabled />
      <Toggle aria-label="비활성 켜짐" disabled defaultChecked />
      <Toggle aria-label="꺼짐" />
      <Toggle aria-label="켜짐" defaultChecked />
    </div>
  ),
};

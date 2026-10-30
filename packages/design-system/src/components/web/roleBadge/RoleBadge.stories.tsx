import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoleBadge } from './RoleBadge';

const meta = {
  title: 'Web/RoleBadge',
  component: RoleBadge,
  args: { memberRole: 'owner', size: 'sm', label: '번치장' },
} satisfies Meta<typeof RoleBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Figma Role Badge 6종: 역할 3 × 크기 2 */
export const Matrix: Story = {
  render: () => (
    <div className="gap-s4 flex flex-col">
      {(['sm', 'md'] as const).map((size) => (
        <div key={size} className="gap-s4 flex items-center">
          <RoleBadge memberRole="owner" size={size} label="번치장" />
          <RoleBadge memberRole="coOwner" size={size} label="공동 번치장" />
          <RoleBadge memberRole="draftAuthor" size={size} label="초안 작성자" />
        </div>
      ))}
    </div>
  ),
};

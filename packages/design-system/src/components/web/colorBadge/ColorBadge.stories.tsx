import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorBadge, type ColorBadgeColor } from './ColorBadge';

const meta = {
  title: 'Web/ColorBadge',
  component: ColorBadge,
  args: { children: '뱃지' },
} satisfies Meta<typeof ColorBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const COLORS: ColorBadgeColor[] = ['gray', 'brand', 'pink', 'green', 'orange'];

/** Figma Badge 20종: 크기 2 × 색 5 × Weak·Fill */
export const Matrix: Story = {
  render: () => (
    <div className="gap-s4 flex flex-col">
      {(['lg', 'md'] as const).map((size) =>
        (['weak', 'fill'] as const).map((variant) => (
          <div key={`${size}-${variant}`} className="gap-s4 flex items-center">
            {COLORS.map((color) => (
              <ColorBadge key={color} size={size} variant={variant} color={color}>
                뱃지
              </ColorBadge>
            ))}
          </div>
        )),
      )}
    </div>
  ),
};

/** 긴 문구는 줄바꿈 없이 부모 너비에서 잘린다 */
export const LongLabel: Story = {
  render: () => (
    <div className="w-24">
      <ColorBadge>아주 긴 뱃지 문구입니다</ColorBadge>
    </div>
  ),
};

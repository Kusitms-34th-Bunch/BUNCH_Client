import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, type BadgeColor, type BadgeSize, type BadgeVariant } from './Badge';

const variants: BadgeVariant[] = ['weak', 'strong'];
const colors: BadgeColor[] = ['brand', 'gray'];
const sizes: BadgeSize[] = ['lg', 'md', 'sm'];

const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: {
    children: 'TIP',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: variants },
    color: { control: 'inline-radio', options: colors },
    size: { control: 'inline-radio', options: sizes },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Figma 표와 같은 배치: 행은 크기, 열은 variant × color */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {sizes.map((size) => (
        <div key={size} className="flex items-center gap-4">
          {variants.flatMap((variant) =>
            colors.map((color) => (
              <Badge key={`${variant}-${color}`} variant={variant} color={color} size={size}>
                TIP
              </Badge>
            )),
          )}
        </div>
      ))}
    </div>
  ),
};

export const LongLabel: Story = {
  render: () => (
    <div className="w-24">
      <Badge>아주 긴 배지 문구 예시입니다</Badge>
    </div>
  ),
};

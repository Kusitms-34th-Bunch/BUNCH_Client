import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton, type SkeletonShape, type SkeletonTone } from './Skeleton';

const shapes: SkeletonShape[] = ['rect', 'round', 'block'];
const tones: SkeletonTone[] = ['default', 'strong'];

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  args: {
    className: 'h-6 w-24',
  },
  argTypes: {
    shape: { control: 'inline-radio', options: shapes },
    tone: { control: 'inline-radio', options: tones },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 모양 × 색 */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {tones.map((tone) => (
        <div key={tone} className="flex items-center gap-4">
          <Skeleton tone={tone} shape="rect" className="h-6 w-24" />
          <Skeleton tone={tone} shape="round" className="size-10" />
          <Skeleton tone={tone} shape="block" className="size-20" />
        </div>
      ))}
    </div>
  ),
};

/** 조합 예: 목록 한 줄(프로필 사진 + 이름) */
export const ListRow: Story = {
  render: () => (
    <div className="flex w-80 items-center gap-3">
      <Skeleton shape="round" className="size-10" />
      <Skeleton className="h-5 w-32" />
    </div>
  ),
};

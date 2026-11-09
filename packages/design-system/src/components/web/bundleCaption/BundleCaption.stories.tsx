import type { Meta, StoryObj } from '@storybook/react-vite';
import { BundleCaption } from './BundleCaption';

const meta = {
  title: 'Web/Feed/BundleCaption',
  component: BundleCaption,
  args: {
    content:
      '퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! 퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! 퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! 퇴근하고 뛰는 게 이렇게 상쾌할 줄이야!',
  },
  decorators: [
    (Story) => (
      <div className="w-86">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BundleCaption>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 2줄을 넘어 「..더보기」 */
export const Long: Story = {};

/** 2줄 이하 */
export const Short: Story = { args: { content: '퇴근하고 뛰는 게 이렇게 상쾌할 줄이야!' } };

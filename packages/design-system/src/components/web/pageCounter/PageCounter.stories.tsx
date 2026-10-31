import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageCounter } from './PageCounter';

const meta = {
  title: 'Web/PageCounter',
  component: PageCounter,
  args: { current: 1, total: 4 },
  // 반투명 알약이라 밝은 사진 위에서 보이도록 어두운 배경
  decorators: [
    (Story) => (
      <div className="bg-surface-inversed p-padding-p8 inline-flex">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageCounter>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Page Counter`: "1/4" */
export const Default: Story = {};

/** 두 자리 숫자 */
export const TwoDigits: Story = { args: { current: 12, total: 20 } };

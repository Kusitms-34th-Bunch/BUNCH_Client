import type { Meta, StoryObj } from '@storybook/react-vite';
import { MenuLabel } from './MenuLabel';

const meta = {
  title: 'Web/MenuLabel',
  component: MenuLabel,
  args: { children: '프로필 편집' },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof MenuLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 긴 글자는 단어 단위 줄바꿈, 화살표는 축소 없음 */
export const LongText: Story = {
  args: { children: '번치에서 나가고 내가 올린 사진과 번들 정리하기' },
};

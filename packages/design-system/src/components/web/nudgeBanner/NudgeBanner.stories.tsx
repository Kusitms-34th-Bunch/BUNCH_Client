import type { Meta, StoryObj } from '@storybook/react-vite';
import { NudgeBanner } from './NudgeBanner';

const meta = {
  title: 'Web/NudgeBanner',
  component: NudgeBanner,
  args: { children: '작성 중인 번들을 완성해 보세요!' },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof NudgeBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma `Status=Default`. 누르고 있으면 overlay-pressed가 겹침 */
export const Default: Story = {};

/** Figma `Status=Disabled`: 흐림(40%), 누를 수 없음 */
export const Disabled: Story = { args: { disabled: true } };

/** 긴 글자는 단어 단위로 줄바꿈, 화살표는 유지 */
export const LongText: Story = {
  args: {
    children: '작성 중인 번들이 3개 있어요. 마감 전에 사진과 코멘트를 채워 번들을 완성해 보세요!',
  },
};

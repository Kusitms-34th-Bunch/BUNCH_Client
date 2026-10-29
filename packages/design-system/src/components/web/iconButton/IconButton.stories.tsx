import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineChevronRightLargeIcon } from '../../../icons';
import { IconButton } from './IconButton';

const meta = {
  title: 'Web/IconButton',
  component: IconButton,
  args: { 'aria-label': '다음', children: <LineChevronRightLargeIcon /> },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Variant=Subtle`: 흰 바탕 */
export const Subtle: Story = { args: { variant: 'subtle' } };

/** Figma `Variant=Outline`: 흰 바탕에 1px 테두리 */
export const Outline: Story = { args: { variant: 'outline' } };

/** Figma `Variant=Primary`: 어두운 바탕에 흰 아이콘 */
export const Primary: Story = { args: { variant: 'primary' } };

/** 세 변형 나란히 보기(Pressed는 버튼을 누른 채로 확인) */
export const Variants: Story = {
  render: () => (
    <div className="gap-s6 bg-surface-secondary p-s6 flex items-center">
      <IconButton aria-label="다음" variant="subtle">
        <LineChevronRightLargeIcon />
      </IconButton>
      <IconButton aria-label="다음" variant="outline">
        <LineChevronRightLargeIcon />
      </IconButton>
      <IconButton aria-label="다음" variant="primary">
        <LineChevronRightLargeIcon />
      </IconButton>
    </div>
  ),
};

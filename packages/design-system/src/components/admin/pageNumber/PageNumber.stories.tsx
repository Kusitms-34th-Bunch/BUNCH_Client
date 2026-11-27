import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageNumber } from './PageNumber';

const meta = {
  title: 'Admin/Navigation/PageNumber',
  component: PageNumber,
  args: { page: 2 },
} satisfies Meta<typeof PageNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default(Hover는 마우스를 올려 확인) */
export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };

export const Disabled: Story = { args: { disabled: true } };

/** Figma 상태 묶음: Disabled·Default·Selected */
export const Matrix: Story = {
  render: () => (
    <div className="gap-s4 flex">
      <PageNumber page={2} disabled />
      <PageNumber page={2} />
      <PageNumber page={2} selected />
    </div>
  ),
};

/** 세 자리 이상은 높이 24 그대로 폭만 늘어남 */
export const LongNumber: Story = {
  render: () => (
    <nav aria-label="페이지" className="gap-s2 flex">
      <PageNumber page={9} />
      <PageNumber page={99} />
      <PageNumber page={128} selected />
      <PageNumber page={1024} />
    </nav>
  ),
};

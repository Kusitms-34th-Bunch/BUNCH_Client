import type { Meta, StoryObj } from '@storybook/react-vite';
import { MetricCard } from './MetricCard';

const meta = {
  title: 'Admin/Card/MetricCard',
  component: MetricCard,
  args: { label: '노출', value: '12,480', unit: '회', description: '하루평균 1,378회' },
  decorators: [
    (Story) => (
      <div className="w-74">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDescription: Story = { args: { description: undefined } };

/** 상세 패널의 성과 격자 예시(2열) */
export const Grid: Story = {
  decorators: [
    (Story) => (
      <div className="gap-s3 grid w-148 grid-cols-2">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <MetricCard label="노출" value="12,480" unit="회" description="하루평균 1,378회" />
      <MetricCard label="콕한 번치" value="128" unit="곳" description="노출 대비 1.0%" />
      <MetricCard
        label="사진 클릭 (링크 이동)"
        value="342"
        unit="회"
        description="노출 대비 2.7%"
      />
      <MetricCard label="숨김" value="4" unit="명" description="노출 대비 0.03%" />
    </>
  ),
};

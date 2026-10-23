import type { Meta, StoryObj } from '@storybook/react-vite';
import { YearOption } from './YearOption';

const meta = {
  title: 'Web/YearOption',
  component: YearOption,
  args: { name: 'year', children: '2012' },
  decorators: [
    (Story) => (
      <div className="w-[343px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof YearOption>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

// 같은 name의 라디오는 하나만 선택. 화면에서는 fieldset·legend로 그룹화
export const Group: Story = {
  render: () => (
    <fieldset>
      <legend className="sr-only">출생연도</legend>
      {['2012', '2011', '2010', '2009'].map((year, index) => (
        <YearOption key={year} name="year-group" value={year} defaultChecked={index === 1}>
          {year}
        </YearOption>
      ))}
    </fieldset>
  ),
};

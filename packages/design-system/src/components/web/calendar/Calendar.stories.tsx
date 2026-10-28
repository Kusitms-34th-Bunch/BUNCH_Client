import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Calendar, type CalendarProps } from './Calendar';

const meta = {
  title: 'Web/Calendar',
  component: Calendar,
  args: { defaultMonth: new Date(2026, 9, 1), selected: new Date(2026, 9, 20) },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-93.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Calender`: 2026년 10월, 20일 선택 */
export const Default: Story = {};

const InteractiveCalendar = (args: CalendarProps) => {
  const [selected, setSelected] = useState<Date | null>(args.selected ?? null);
  return <Calendar {...args} selected={selected} onSelectDate={setSelected} />;
};

/** 날짜를 눌러 고르고 화살표로 달을 옮겨 보기 */
export const Interactive: Story = {
  render: (args) => <InteractiveCalendar {...args} />,
};

/** 12일 이전과 24일 이후, 그리고 일요일은 고를 수 없음 */
export const DisabledDates: Story = {
  args: {
    selected: null,
    minDate: new Date(2026, 9, 12),
    maxDate: new Date(2026, 9, 24),
    isDateDisabled: (date) => date.getDay() === 0,
  },
};

/** 한글 요일 글자로 바꾸기 */
export const KoreanWeekdays: Story = {
  args: { weekdayLabels: ['일', '월', '화', '수', '목', '금', '토'] },
};

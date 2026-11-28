import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DatePickerField } from './DatePickerField';

const meta = {
  title: 'Admin/Input/DatePickerField',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (value: number) => String(value).padStart(2, '0');

// 화면설계서 표시 예: 「2026.11.25(수) 00:00」(시간 규칙은 화면이 정함)
const formatWithTime = (time: string) => (date: Date) =>
  `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}(${WEEKDAYS[date.getDay()]}) ${time}`;

/** 눌러서 달력 열기(Focused), 날짜 고르기(Selected), 직접 입력 후 Enter·칸 벗어나기(Filled) */
export const Default: Story = {
  render: function Render() {
    const [value, setValue] = useState<Date | null>(null);
    return (
      <div className="w-94">
        <DatePickerField
          aria-label="시작일"
          calendarLabel="시작일 달력"
          invalidInputMessage="날짜를 2026.11.25 형식으로 입력해주세요"
          value={value}
          onValueChange={setValue}
          formatValue={formatWithTime('00:00')}
          placeholder="시작일 선택 또는 입력"
        />
      </div>
    );
  },
};

/** 화면설계서 「번치 스팟 등록」 노출 기간: 시작일 00:00 · 종료일 23:59, 시작일은 오늘부터 */
export const Period: Story = {
  render: function Render() {
    const [start, setStart] = useState<Date | null>(new Date(2026, 10, 25));
    const [end, setEnd] = useState<Date | null>(null);
    return (
      <div className="gap-s2 flex items-center">
        <DatePickerField
          aria-label="노출 시작일"
          calendarLabel="노출 시작일 달력"
          value={start}
          onValueChange={setStart}
          formatValue={formatWithTime('00:00')}
          placeholder="시작일을 선택해주세요"
          className="w-94"
          minDate={new Date(2026, 10, 1)}
        />
        <span aria-hidden="true" className="typography-body-3-semibold text-text-secondary">
          -
        </span>
        <DatePickerField
          aria-label="노출 종료일"
          calendarLabel="노출 종료일 달력"
          value={end}
          onValueChange={setEnd}
          formatValue={formatWithTime('23:59')}
          placeholder="종료일을 선택해주세요"
          className="w-94"
          minDate={start ?? undefined}
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-94">
      <DatePickerField
        aria-label="시작일"
        calendarLabel="시작일 달력"
        value={null}
        onValueChange={() => {}}
        placeholder="시작일 선택 또는 입력"
        disabled
      />
    </div>
  ),
};

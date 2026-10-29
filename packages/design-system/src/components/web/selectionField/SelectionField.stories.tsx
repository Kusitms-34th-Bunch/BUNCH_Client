import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SelectionField } from './SelectionField';

const meta = {
  title: 'Web/SelectionField',
  component: SelectionField,
  args: { label: '위치 추가', required: true },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-94">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectionField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `State=Default, Suggestion=False`: 선택 전 안내 문구와 화살표 */
export const Default: Story = {};

/** Figma `State=Selected, Suggestion=False`: 선택한 값과 지우기 버튼 */
export const Selected: Story = { args: { label: '서울특별시 여의도동', selected: true } };

/** Figma `State=Default, Suggestion=True`: 아래에 추천 값 */
export const WithSuggestions: Story = {
  args: { suggestions: ['서울특별시', '서울특별시 여의도동', '여의도동'] },
};

/** 필수 표시 없이 */
export const NotRequired: Story = { args: { required: false } };

/** 긴 값은 한 줄로 줄이고 오른쪽 아이콘은 그대로 */
export const LongLabel: Story = {
  args: { label: '서울특별시 영등포구 여의도동 국회대로 76길 아주 긴 주소', selected: true },
};

const SUGGESTIONS = ['서울특별시', '서울특별시 여의도동', '여의도동'];

const InteractiveField = () => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <SelectionField
      required
      label={value ?? '위치 추가'}
      selected={value !== null}
      suggestions={SUGGESTIONS}
      onSuggestionClick={setValue}
      onFieldClick={() => setValue('서울특별시 여의도동')}
      onClear={() => setValue(null)}
    />
  );
};

/** 추천 값을 누르면 선택되고 지우기 버튼으로 되돌리기 */
export const Interactive: Story = { render: () => <InteractiveField /> };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Label } from './Label';

const meta = {
  title: 'Web/Label',
  component: Label,
  args: { children: '필수 항목 모두 체크하기' },
  decorators: [
    (Story) => (
      <div className="w-[343px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const States: Story = {
  render: (args) => (
    <div className="space-y-s6">
      <Label {...args} />
      <Label {...args} defaultChecked />
    </div>
  ),
};

export const LongLabel: Story = {
  args: { children: '아주 긴 문구가 들어와도 줄바꿈되어 모두 보여야 하고 잘리지 않아야 합니다' },
};

// 설계서: 전체 선택 행 하나가 하위 항목을 모두 선택·해제하고, 하위가 모두 선택되면 전체 행도 선택된다
const WithChildrenDemo = () => {
  const [items, setItems] = useState([false, false, false]);
  const all = items.every(Boolean);

  return (
    <div className="space-y-s6">
      <Label checked={all} onChange={(event) => setItems(items.map(() => event.target.checked))}>
        필수 항목 모두 체크하기
      </Label>
      {items.map((checked, index) => (
        <label key={index} className="gap-s3 px-padding-p4 flex items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) =>
              setItems(items.map((value, i) => (i === index ? event.target.checked : value)))
            }
          />
          약관 {index + 1}
        </label>
      ))}
    </div>
  );
};

export const WithChildren: Story = { render: () => <WithChildrenDemo /> };

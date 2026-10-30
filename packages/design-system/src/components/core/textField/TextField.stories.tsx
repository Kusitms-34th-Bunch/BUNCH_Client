import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { Button } from '../button';
import { TextField } from './TextField';

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: '이름', placeholder: '글, 제목, 내용을 입력해주세요.' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

// 값을 호출하는 쪽이 맡는 controlled 예(스토리 전용). onClear는 값 초기화
const Controlled = ({
  initial = '',
  onClear,
  ...args
}: ComponentProps<typeof TextField> & { initial?: string }) => {
  const [value, setValue] = useState(initial);
  return (
    <TextField
      {...args}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      {...(onClear ? { onClear: () => setValue('') } : {})}
    />
  );
};

const render: Story['render'] = (args) => <Controlled {...args} />;
const filled: Story['render'] = (args) => <Controlled {...args} initial="으누누" />;

const clear = { onClear: () => undefined };
const action = (
  <Button variant="brandSubtle" size="sm">
    BUTTON
  </Button>
);

// 기본 변형: 지우기·버튼 없음
export const Default: Story = { render };
export const Focused: Story = { render, args: { autoFocus: true } };
export const Filled: Story = { render: filled };
export const Editing: Story = { render, args: { editing: true } };
export const Disabled: Story = { render, args: { disabled: true } };

// 지우기 변형: 모든 상태에서 지우기 버튼 표시
export const ClearDefault: Story = { render, args: clear };
export const ClearFocused: Story = { render, args: { ...clear, autoFocus: true } };
export const ClearFilled: Story = { render: filled, args: clear };
export const ClearEditing: Story = { render, args: { ...clear, editing: true } };
export const ClearDisabled: Story = { render, args: { ...clear, disabled: true } };

// 버튼 변형: 오른쪽에 동작 영역
export const ButtonDefault: Story = { render, args: { action } };
export const ButtonFocused: Story = { render, args: { action, autoFocus: true } };
export const ButtonFilled: Story = { render: filled, args: { action } };
export const ButtonEditing: Story = { render, args: { action, editing: true } };
export const ButtonDisabled: Story = { render, args: { action, disabled: true } };

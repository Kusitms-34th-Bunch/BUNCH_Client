import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../button';
import { TextField } from './TextField';

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: '이름', placeholder: '입력해주세요.' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 값이 있을 때만 지우기 버튼이 보인다(controlled) */
const ClearableExample = (args: React.ComponentProps<typeof TextField>) => {
  const [value, setValue] = useState('입력한 글');
  return (
    <TextField
      {...args}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onClear={() => setValue('')}
    />
  );
};

export const Clearable: Story = {
  render: (args) => <ClearableExample {...args} />,
};

export const WithAction: Story = {
  args: {
    action: (
      <Button variant="brandSubtle" size="sm">
        확인
      </Button>
    ),
  },
};

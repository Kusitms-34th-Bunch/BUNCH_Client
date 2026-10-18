import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { LabeledTextField, type LabeledTextFieldProps } from './LabeledTextField';

const meta = {
  title: 'Web/LabeledTextField',
  component: LabeledTextField,
  args: { title: '닉네임', option: 'required', maxLength: 12 },
  decorators: [
    (Story) => (
      <div className="w-[343px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LabeledTextField>;

export default meta;

type Story = StoryObj<typeof meta>;

// 값과 지우기를 호출하는 쪽이 맡는 controlled 사용 예
const Controlled = (args: LabeledTextFieldProps & { initial?: string; focusOnMount?: boolean }) => {
  const { initial = '', focusOnMount = false, ...rest } = args;
  const [value, setValue] = useState(initial);
  const rootRef = useRef<HTMLDivElement>(null);

  // 포커스 상태(Focused·Editing)를 보여 주려고 마운트 때 입력창에 포커스를 준다(스토리 전용)
  useEffect(() => {
    if (focusOnMount) rootRef.current?.querySelector('input')?.focus();
  }, [focusOnMount]);

  return (
    <div ref={rootRef}>
      <LabeledTextField
        {...rest}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onClear={() => setValue('')}
      />
    </div>
  );
};

// Figma Default: 값이 없고 포커스도 없다
export const Default: Story = { render: (args) => <Controlled {...args} /> };

// Figma Focused: 값이 없는 채로 입력창에 포커스(캐럿만 보임)
export const Focused: Story = { render: (args) => <Controlled {...args} focusOnMount /> };

// Figma Editing: 값이 있는 채로 포커스. 오른쪽에 지우기 버튼이 나온다
export const Editing: Story = {
  render: (args) => <Controlled {...args} initial="으누누" focusOnMount />,
};

// Figma Filled: 값이 있고 포커스는 없다. 지우기 버튼이 없다
export const Filled: Story = { render: (args) => <Controlled {...args} initial="으누누" /> };

// Figma Error: 오류 문구가 왼쪽에, 글자 수가 오른쪽에 보인다
export const ErrorState: Story = {
  render: (args) => (
    <Controlled
      {...args}
      initial="으누누으누누"
      errorMessage="특수문자를 제외한 영문, 한글만 사용할 수 있어요."
    />
  ),
};

export const Disabled: Story = { render: (args) => <Controlled {...args} disabled /> };

export const OptionalWithoutCounter: Story = {
  render: (args) => (
    <Controlled {...args} title="한 줄 소개" option="optional" maxLength={undefined} />
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { LabeledTextField, type LabeledTextFieldProps } from './LabeledTextField';

const meta = {
  title: 'Web/LabeledTextField',
  component: LabeledTextField,
  args: { title: '닉네임', option: 'required', maxLength: 12 },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LabeledTextField>;

export default meta;

type Story = StoryObj<typeof meta>;

// 값을 호출하는 쪽이 맡는 controlled 사용 예
const Controlled = (args: LabeledTextFieldProps & { initial?: string; focusOnMount?: boolean }) => {
  const { initial = '', focusOnMount = false, ...rest } = args;
  const [value, setValue] = useState(initial);
  const rootRef = useRef<HTMLDivElement>(null);

  // Focused 상태 표시를 위해 마운트 때 입력창에 포커스(스토리 전용)
  useEffect(() => {
    if (focusOnMount) rootRef.current?.querySelector('input')?.focus();
  }, [focusOnMount]);

  return (
    <div ref={rootRef}>
      <LabeledTextField
        {...rest}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
};

// Figma Default: 값·포커스 없음
export const Default: Story = { render: (args) => <Controlled {...args} /> };

// 입력창 Focused: 값이 없는 채로 포커스(캐럿만 보임)
export const Focused: Story = { render: (args) => <Controlled {...args} focusOnMount /> };

// 입력창 Filled: 값 있음
export const Filled: Story = { render: (args) => <Controlled {...args} initial="으누누" /> };

// 입력창 Editing: 점 3개 애니메이션
export const Editing: Story = { render: (args) => <Controlled {...args} editing /> };

// 오류 문구는 왼쪽, 글자 수는 오른쪽에 표시
export const ErrorState: Story = {
  render: (args) => (
    <Controlled
      {...args}
      initial="으누누으누누"
      errorMessage="특수문자를 제외한 영문, 한글만 사용할 수 있어요."
    />
  ),
};

// Figma Disabled: 제목·입력창·글자 수·오류 문구 전체가 40% 투명
export const Disabled: Story = { render: (args) => <Controlled {...args} disabled /> };

export const DisabledWithError: Story = {
  render: (args) => (
    <Controlled {...args} disabled errorMessage="입력 가능한 글자수를 초과했어요" />
  ),
};

export const OptionalWithoutCounter: Story = {
  render: (args) => (
    <Controlled {...args} title="한 줄 소개" option="optional" maxLength={undefined} />
  ),
};

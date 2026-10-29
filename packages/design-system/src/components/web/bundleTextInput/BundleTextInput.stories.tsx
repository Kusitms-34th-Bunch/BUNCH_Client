import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { BundleTextInput } from './BundleTextInput';

const meta = {
  title: 'Web/BundleTextInput',
  component: BundleTextInput,
  args: { title: '사진' },
  decorators: [
    (Story) => (
      <div className="w-86">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BundleTextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Figma 기본 변형: 멤버 아바타 한 명, 입력값, 오류 문구
export const Figma: Story = {
  args: {
    members: [{ name: '김번치' }],
    defaultValue: '퇴근하고 달리는 사람들',
    errorMessage: '입력 가능한 글자수를 초과했어요',
  },
};

export const WithError: Story = {
  args: { defaultValue: '퇴근하고 달리는 사람들', errorMessage: '입력 가능한 글자수를 초과했어요' },
};

export const Required: Story = { args: { required: true } };

const LengthLimited = () => {
  const [value, setValue] = useState('퇴근하고 달리는 사람들');
  const tooLong = value.length > 10;
  return (
    <BundleTextInput
      title="사진"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      errorMessage={tooLong ? '입력 가능한 글자수를 초과했어요' : undefined}
    />
  );
};

// 10자를 넘기면 오류 문구가 나타나고 줄이면 사라짐(검증 규칙은 호출하는 쪽)
export const Interactive: Story = { render: () => <LengthLimited /> };

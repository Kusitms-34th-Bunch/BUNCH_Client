import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LabeledTextArea } from './LabeledTextArea';

const meta = {
  title: 'Web/LabeledTextArea',
  component: LabeledTextArea,
  args: {
    label: '한 줄 소개',
    placeholder: '우리 번치를 간단하게 소개해주세요',
    maxLength: 50,
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LabeledTextArea>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 비어 있을 때: 안내 문구와 0/50 */
export const Empty: Story = { args: { value: '', onChange: () => {} } };

export const Focused: Story = {
  args: { value: '', onChange: () => {}, autoFocus: true },
};

/** 길어지면 줄바꿈되고 높이가 늘어난다 */
export const Wrapped: Story = {
  args: {
    value: '소소한 일상도 특별하게 기록하는 사이 소소한 일상도 특별하게 기록하는 사이소소한 일상',
    onChange: () => {},
  },
};

export const Error: Story = {
  args: { value: '소개', onChange: () => {}, error: '입력할 수 없는 문자가 있어요.' },
};

const InteractiveExample = (args: React.ComponentProps<typeof LabeledTextArea>) => {
  const [value, setValue] = useState('');
  return <LabeledTextArea {...args} value={value} onChange={(e) => setValue(e.target.value)} />;
};

/** 입력하면서 글자 수와 높이가 바뀌는 모습. 스냅샷에서는 제외 */
export const Interactive: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: (args) => <InteractiveExample {...args} />,
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LabeledTextField } from './LabeledTextField';

const meta = {
  title: 'Core/LabeledTextField',
  component: LabeledTextField,
  args: { label: '번치 이름', placeholder: '번치 이름을 입력해주세요', maxLength: 12 },
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

/** 비어 있을 때: 안내 문구와 0/12 */
export const Empty: Story = { args: { value: '', onChange: () => {} } };

export const Filled: Story = { args: { value: '퇴근런클럽', onChange: () => {} } };

export const Error: Story = {
  args: {
    value: '퇴근런클@',
    onChange: () => {},
    error: '특수문자를 제외한 영문, 한글만 사용할 수 있어요.',
  },
};

/** 글자 수 없이 라벨과 입력창만 */
export const WithoutCount: Story = {
  args: { value: '', onChange: () => {}, maxLength: undefined },
};

const InteractiveExample = (args: React.ComponentProps<typeof LabeledTextField>) => {
  const [value, setValue] = useState('');
  const invalid = /[^A-Za-z0-9가-힣]/.test(value);
  return (
    <LabeledTextField
      {...args}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      error={invalid ? '특수문자를 제외한 영문, 한글만 사용할 수 있어요.' : undefined}
    />
  );
};

/** 입력하면서 글자 수와 오류가 바뀌는 모습. 스냅샷에서는 제외 */
export const Interactive: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: (args) => <InteractiveExample {...args} />,
};

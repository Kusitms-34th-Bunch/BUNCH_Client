import type { Meta, StoryObj } from '@storybook/react-vite';
import { Radio } from './Radio';

const meta = {
  title: 'Components/Radio',
  component: Radio,
  args: { 'aria-label': '비공개' },
} satisfies Meta<typeof Radio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

/** Figma 상태 한눈에 보기(Pressed는 누르는 동안만 보여 정지 화면에 없음) */
export const States: Story = {
  render: () => (
    <div className="gap-s6 flex items-center">
      <Radio aria-label="기본" />
      <Radio aria-label="선택됨" defaultChecked />
      <Radio aria-label="비활성" disabled />
    </div>
  ),
};

/** 글자와 함께 쓰는 그룹: label로 이름을 주고 fieldset·legend로 질문을 묶음 */
export const Group: Story = {
  render: () => (
    <fieldset className="gap-s4 flex flex-col">
      <legend className="typography-body-2-meduim pb-s4">공개 범위</legend>
      {[
        ['private', '비공개'],
        ['public', '전체 공개'],
      ].map(([value, text]) => (
        <label key={value} className="gap-s3 typography-body-3-regular flex items-center">
          <Radio name="visibility" value={value} defaultChecked={value === 'private'} />
          {text}
        </label>
      ))}
    </fieldset>
  ),
};

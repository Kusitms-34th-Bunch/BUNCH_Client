import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { GraphicGlobeIcon, GraphicLockIcon } from '../../../icons';
import { VisibilityOption } from './VisibilityOption';

const meta = {
  title: 'Web/VisibilityOption',
  component: VisibilityOption,
  args: {
    name: 'visibility',
    title: '비공개 번치',
    description: '팔로우를 승인한 번치만 볼 수 있어요',
    icon: <GraphicLockIcon />,
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VisibilityOption>;

const GroupExample = (args: React.ComponentProps<typeof VisibilityOption>) => {
  const [value, setValue] = useState('public');
  return (
    <fieldset className="gap-s4 flex flex-col">
      <legend className="typography-label-m pb-s4">공개 범위</legend>
      <VisibilityOption
        {...args}
        value="private"
        checked={value === 'private'}
        onChange={() => setValue('private')}
      />
      <VisibilityOption
        {...args}
        title="공개 번치"
        description="누구나 번치의 기록을 볼 수 있어요"
        icon={<GraphicGlobeIcon />}
        value="public"
        checked={value === 'public'}
        onChange={() => setValue('public')}
      />
    </fieldset>
  );
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { defaultChecked: true } };

/** 선택된 카드만 어둡게 표시, 다른 카드는 해제. 스냅샷에서는 제외 */
export const Group: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: (args) => <GroupExample {...args} />,
};

export const LongText: Story = {
  args: {
    title: '아주 긴 공개 범위 이름이 들어가도 카드 안에서 줄바꿈된다',
    description:
      '설명이 길어도 아이콘을 밀어내지 않고 여러 줄로 보여 준다. 카드 높이는 내용만큼 늘어난다',
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-70">
        <Story />
      </div>
    ),
  ],
};

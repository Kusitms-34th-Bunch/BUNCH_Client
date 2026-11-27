import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tab } from '../tab';
import { TabList } from './TabList';

const meta = {
  title: 'Admin/Navigation/TabList',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Example = ({ initial = 'received' }: { initial?: string }) => {
  const [value, setValue] = useState(initial);
  return (
    <TabList aria-label="신고 상태" value={value} onValueChange={setValue}>
      <Tab value="all" count={15}>
        전체
      </Tab>
      <Tab value="received" count={12}>
        접수
      </Tab>
      <Tab value="done" count={3}>
        조치
      </Tab>
      <Tab value="hidden" disabled>
        숨김
      </Tab>
    </TabList>
  );
};

/** 신고 조회처럼 상태별 건수를 보여 주는 탭 묶음. 방향키로 초점 이동, Enter·Space로 선택 */
export const Default: Story = { render: () => <Example /> };

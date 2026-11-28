import type { Meta, StoryObj } from '@storybook/react-vite';
import { TabList } from '../tabList';
import { Tab } from './Tab';

const meta = {
  title: 'Admin/Navigation/Tab',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};

/** Figma 4상태: Disabled·Default·Selected(Hover는 마우스를 올려 확인) */
export const Matrix: Story = {
  render: () => (
    <TabList aria-label="상태 예시" value="selected" onValueChange={noop} className="gap-s4">
      <Tab value="disabled" count={12} disabled>
        전체
      </Tab>
      <Tab value="default" count={12}>
        전체
      </Tab>
      <Tab value="selected" count={12}>
        전체
      </Tab>
    </TabList>
  ),
};

export const WithoutCount: Story = {
  render: () => (
    <TabList aria-label="건수 없는 탭" value="all" onValueChange={noop}>
      <Tab value="all">전체</Tab>
      <Tab value="received">접수</Tab>
    </TabList>
  ),
};

/** 긴 이름은 줄바꿈하지 않고 탭 폭이 늘어남 */
export const LongLabel: Story = {
  render: () => (
    <TabList aria-label="긴 이름" value="long" onValueChange={noop}>
      <Tab value="long" count={1280}>
        댓글 및 답글 신고 처리 대기
      </Tab>
      <Tab value="short">조치</Tab>
    </TabList>
  ),
};

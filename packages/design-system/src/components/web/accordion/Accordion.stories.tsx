import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion } from './Accordion';

const meta = {
  title: 'Web/Accordion',
  component: Accordion,
  args: {
    title: '촬영 날짜를 확인할 사진',
    description: '날짜 확인하고 추억 정리하기',
    count: '9장',
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-93.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDescription: Story = {
  render: () => <Accordion title="촬영 날짜를 확인할 사진" />,
};

export const Open: Story = {
  render: (args) => (
    <Accordion {...args} defaultOpen>
      <p className="typography-body-3-regular text-text-tertiary p-s8">열린 항목의 내용</p>
    </Accordion>
  ),
};

export const OpenWithoutDescription: Story = {
  render: () => (
    <Accordion title="촬영 날짜를 확인할 사진" defaultOpen>
      <p className="typography-body-3-regular text-text-tertiary p-s8">열린 항목의 내용</p>
    </Accordion>
  ),
};

/** 긴 제목은 한 줄 말줄임, 개수는 줄어들지 않음 */
export const LongTitle: Story = {
  args: { title: '촬영 날짜를 확인해야 하는 아주 긴 제목의 사진 묶음 이름' },
};

/** 눌러서 펼치고 접는 예: 내용은 호출하는 쪽이 꾸밈 */
export const Interactive: Story = {
  render: (args) => (
    <Accordion {...args}>
      <p className="typography-body-3-regular text-text-tertiary p-s8">
        여기에 사진 목록이 들어갑니다.
      </p>
    </Accordion>
  ),
};

/** 여러 항목을 나란히 놓은 예(Figma의 닫힘·열림 6변형 한눈에 보기) */
export const List: Story = {
  render: () => (
    <div className="gap-s4 flex flex-col">
      <Accordion
        title="촬영 날짜를 확인할 사진"
        count="9장"
        description="날짜 확인하고 추억 정리하기"
      />
      <Accordion
        title="촬영 날짜를 확인할 사진"
        count="9장"
        description="날짜 확인하고 추억 정리하기"
        defaultOpen
      >
        <p className="typography-body-3-regular text-text-tertiary p-s8">열린 항목의 내용</p>
      </Accordion>
      <Accordion title="촬영 날짜를 확인할 사진" />
      <Accordion title="촬영 날짜를 확인할 사진" defaultOpen>
        <p className="typography-body-3-regular text-text-tertiary p-s8">열린 항목의 내용</p>
      </Accordion>
    </div>
  ),
};

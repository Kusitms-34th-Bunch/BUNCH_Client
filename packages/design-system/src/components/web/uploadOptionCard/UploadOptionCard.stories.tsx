import type { Meta, StoryObj } from '@storybook/react-vite';
import { UploadOptionCard } from './UploadOptionCard';

const meta = {
  title: 'Web/UploadOptionCard',
  component: UploadOptionCard,
  args: { title: '앨범에서 선택', description: '여러 장을 한 번에 올려요' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UploadOptionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Camera: Story = {
  args: { title: '카메라로 찍기', description: '지금 찍은 사진을 바로 올려요.', icon: 'camera' },
};

/** 긴 글자는 줄바꿈해서 카드 높이가 늘어남 */
export const LongText: Story = {
  args: {
    title: '앨범에서 사진을 골라서 번들에 한꺼번에 올리기',
    description: '여러 장을 한 번에 올릴 수 있고 올린 뒤에도 순서를 바꿀 수 있어요',
  },
};

/** 여러 방식을 세로로 놓은 예(눌림은 카드를 눌러서 확인) */
export const List: Story = {
  render: () => (
    <div className="gap-s5 flex flex-col">
      <UploadOptionCard title="앨범에서 선택" description="여러 장을 한 번에 올려요" />
      <UploadOptionCard title="사진 찍어서 올리기" description="지금 찍은 사진을 바로 올려요" />
    </div>
  ),
};

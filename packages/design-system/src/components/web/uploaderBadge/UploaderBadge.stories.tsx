import type { Meta, StoryObj } from '@storybook/react-vite';
import { UploaderBadge } from './UploaderBadge';

// 스토리용 자리표시 이미지, 실제 프로필 사진은 호출하는 쪽이 전달
const sample =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 52 52'><rect width='52' height='52' fill='%23A7ADFF'/><circle cx='26' cy='21' r='9' fill='white'/><ellipse cx='26' cy='46' rx='16' ry='13' fill='white'/></svg>";

const meta = {
  title: 'Web/UploaderBadge',
  component: UploaderBadge,
  args: { name: '경진', avatarSrc: sample },
} satisfies Meta<typeof UploaderBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 프로필 사진이 없을 때: 배경색 원만 보임 */
export const WithoutAvatar: Story = { args: { avatarSrc: undefined } };

/** 긴 이름은 부모 폭 안에서 한 줄 말줄임 */
export const LongName: Story = {
  args: { name: '아주아주긴이름을가진업로더' },
  decorators: [
    (Story) => (
      <div className="w-32">
        <Story />
      </div>
    ),
  ],
};

/** 사진 위에 얹은 예: 좌측 하단 위치는 임의로 정한 예시이고 실제 배치는 화면에서 정함 */
export const OnPhoto: Story = {
  render: (args) => (
    <div className="rounded-r4 bg-primitive-bunch-500 relative h-40 w-60">
      <UploaderBadge {...args} className="absolute bottom-2 left-2" />
    </div>
  ),
};

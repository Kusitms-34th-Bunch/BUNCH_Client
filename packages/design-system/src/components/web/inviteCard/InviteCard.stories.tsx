import type { Meta, StoryObj } from '@storybook/react-vite';
import { InviteCard } from './InviteCard';

// 스토리용 자리표시 이미지. 실제 이미지는 호출하는 쪽이 넘긴다
const sample =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><rect width='160' height='160' fill='%23A7ADFF'/><ellipse cx='80' cy='120' rx='60' ry='36' fill='white'/><circle cx='80' cy='86' r='34' fill='white'/></svg>";

const meta = {
  title: 'Web/InviteCard',
  component: InviteCard,
  args: {
    bunchName: '여행가조',
    description: '틈만 나면 떠나는 여행 좋아하는 네 명',
    senderName: '민지',
    imageSrc: sample,
    onJoin: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-73.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InviteCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** imageSrc가 없을 때: 이미지 없는 빈 원 */
export const NoImage: Story = { args: { imageSrc: undefined } };

export const LongText: Story = {
  args: {
    bunchName: '아주 긴 번치 이름이 들어가도 줄바꿈되어 모두 보이는 번치',
    description: '소개 문구가 길어도 카드 안에서 줄바꿈되고 카드 높이가 늘어난다',
    senderName: '아주긴이름을가진사람',
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

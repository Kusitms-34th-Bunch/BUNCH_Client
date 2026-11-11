import type { Meta, StoryObj } from '@storybook/react-vite';
import { InviteCard } from './InviteCard';

// 스토리용 자리표시 이미지. 실제 이미지는 호출하는 쪽이 전달
const sample =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><rect width='160' height='160' fill='%23A7ADFF'/><ellipse cx='80' cy='120' rx='60' ry='36' fill='white'/><circle cx='80' cy='86' r='34' fill='white'/></svg>";

const meta = {
  title: 'Web/Card/InviteCard',
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

/** 서버 카드의 소개가 비었을 때: 소개 줄을 그리지 않음 */
export const NoDescription: Story = { args: { description: undefined } };

/** 초대한 사람이 없을 때(나갔거나 탈퇴): From 줄을 그리지 않음 */
export const NoSender: Story = { args: { senderName: undefined } };

/** 다시 해도 안 되는 참여 실패 뒤: 「참여하기」 비활성 */
export const JoinDisabled: Story = { args: { joinDisabled: true } };

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

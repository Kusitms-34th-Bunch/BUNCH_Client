import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../../core/button';
import { FollowListItem } from './FollowListItem';

const meta = {
  title: 'Web/FollowListItem',
  component: FollowListItem,
  args: { name: '야간러너스', isPrivate: true },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof FollowListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma `Profile List - 02` Unfollow: 「팔로우」. 버튼 이름에 행 이름을 붙여 목록에서 구분(호출자 예시) */
export const Follow: Story = {
  args: {
    action: (
      <Button variant="primary" size="sm" aria-label="야간러너스 팔로우">
        팔로우
      </Button>
    ),
  },
};

/** Figma `Profile List - 02` Follow: 「팔로잉」 */
export const Following: Story = {
  args: {
    action: (
      <Button
        variant="secondary"
        size="sm"
        className="text-text-tertiary"
        aria-label="야간러너스 팔로잉"
      >
        팔로잉
      </Button>
    ),
  },
};

/** Figma `Profile List - 3`: 요청 시각과 「승인」·「거절」 */
export const Request: Story = {
  args: {
    meta: '1일 전',
    action: (
      <>
        <Button variant="primary" size="sm" aria-label="야간러너스 승인">
          승인
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="text-text-tertiary"
          aria-label="야간러너스 거절"
        >
          거절
        </Button>
      </>
    ),
  },
};

export const Public: Story = {
  args: {
    isPrivate: false,
    action: (
      <Button variant="primary" size="sm" aria-label="야간러너스 팔로우">
        팔로우
      </Button>
    ),
  },
};

/** 긴 이름은 말줄임, 자물쇠·버튼은 유지 */
export const LongName: Story = {
  args: {
    name: '아주아주아주아주긴이름을가진사용자입니다',
    meta: '1일 전',
    action: (
      <>
        <Button
          variant="primary"
          size="sm"
          aria-label="아주아주아주아주긴이름을가진사용자입니다 승인"
        >
          승인
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="text-text-tertiary"
          aria-label="아주아주아주아주긴이름을가진사용자입니다 거절"
        >
          거절
        </Button>
      </>
    ),
  },
};

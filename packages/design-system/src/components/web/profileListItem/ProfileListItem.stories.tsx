import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../../core/button';
import { ChipButton } from '../chipButton';
import { ProfileListItem } from './ProfileListItem';

const meta = {
  title: 'Web/ProfileListItem',
  component: ProfileListItem,
  args: { name: '은우링링링' },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<typeof ProfileListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { onMore: () => {} } };

/** Figma `Profile List- 01`: 역할 배지와 「(나)」. 더보기를 누르고 있으면 원형 눌림 표시 */
export const Me: Story = {
  args: { suffix: '(나)', memberRole: 'owner', roleLabel: '번치장', onMore: () => {} },
};

/** Figma `Profile List - Button`: 오른쪽 「차단해제」 */
export const WithButton: Story = {
  args: {
    name: '야간러너스',
    action: (
      <Button variant="secondary" size="sm" className="text-text-tertiary">
        차단해제
      </Button>
    ),
  },
};

/** Figma에 숨겨진 「추가하기」 칩 */
export const WithChip: Story = {
  args: { action: <ChipButton>추가하기</ChipButton> },
};

export const Disabled: Story = {
  args: {
    suffix: '(나)',
    memberRole: 'owner',
    roleLabel: '번치장',
    onMore: () => {},
    disabled: true,
  },
};

/** 긴 이름은 말줄임, 「(나)」·더보기는 유지 */
export const LongName: Story = {
  args: { name: '아주아주아주아주긴이름을가진멤버입니다', suffix: '(나)', onMore: () => {} },
};

/** 비활성 행의 `action`은 inert라 누르거나 초점을 받지 못함 */
export const DisabledWithButton: Story = {
  args: {
    name: '야간러너스',
    disabled: true,
    action: (
      <Button variant="secondary" size="sm" className="text-text-tertiary">
        차단해제
      </Button>
    ),
  },
};

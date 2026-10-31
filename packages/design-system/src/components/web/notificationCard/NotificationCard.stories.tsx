import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationCard } from './NotificationCard';

const meta = {
  title: 'Web/NotificationCard',
  component: NotificationCard,
  parameters: { layout: 'padded' },
  args: {
    title: '[퇴근런클럽] 번치가 삭제됐어요',
    description: '관리자에 의해 그룹이 영구 삭제되었습니다.',
    time: '방금 전',
    unread: true,
  },
  decorators: [
    (Story) => (
      <div className="bg-surface-tertiary p-padding-p8 max-w-93.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Figma `Important`: 경고 아이콘과 빨간 제목 */
export const Important: Story = { args: { important: true } };

export const Read: Story = { args: { unread: false } };

/** 흐림(40%), 누를 수 없지만 초점은 받음 */
export const Disabled: Story = { args: { disabled: true } };

export const ImportantDisabled: Story = { args: { important: true, disabled: true } };

export const LongText: Story = {
  args: {
    title: '[퇴근 후 한강 러닝 클럽 모임] 번치 관리자가 바뀌었어요',
    description:
      '이전 관리자가 번치를 나가서 가장 오래 참여한 멤버가 새 관리자가 되었습니다. 번치 설정에서 확인해 보세요.',
  },
};

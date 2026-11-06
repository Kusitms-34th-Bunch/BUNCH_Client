import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmDialog } from '../../core/dialog';
import { BunchLabel } from './BunchLabel';

const meta = {
  title: 'Web/Profile/BunchLabel',
  component: BunchLabel,
  args: { name: '퇴근런클럽', onClick: () => {} },
  decorators: [
    (Story) => (
      <div className="w-66.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BunchLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma Default(267px 폭). 누르는 동안 Pressed 모습 */
export const Default: Story = {};

/** Figma Disabled */
export const Disabled: Story = { args: { disabled: true } };

/** 긴 이름은 한 줄 말줄임 */
export const LongName: Story = {
  args: { name: '매주 화요일 저녁에 모여서 한강을 달리는 퇴근 후 러닝크루' },
};

/** Figma Dialog Label 변형(`3537:65744`): `ConfirmDialog`의 내용 자리에 번치 줄 목록 */
export const InConfirmDialog: Story = {
  decorators: [],
  render: () => (
    <ConfirmDialog
      open
      onOpenChange={() => {}}
      title="관리자로 있는 번치가 있어요"
      description="아래 번치의 관리자 권한을 다른 멤버에게 넘긴 뒤 탈퇴할 수 있어요."
      cancelLabel="취소"
      confirmLabel="이전 완료"
      onConfirm={() => {}}
    >
      <ul aria-label="관리자 권한을 넘길 번치" className="gap-s3 flex flex-col">
        <li>
          <BunchLabel name="퇴근런클럽" onClick={() => {}} />
        </li>
        <li>
          <BunchLabel name="독서모임" onClick={() => {}} />
        </li>
      </ul>
    </ConfirmDialog>
  ),
};

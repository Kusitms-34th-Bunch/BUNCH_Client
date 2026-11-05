import type { Meta, StoryObj } from '@storybook/react-vite';
import { AccountSwitcher } from './AccountSwitcher';

const meta = {
  title: 'Components/AccountSwitcher',
  component: AccountSwitcher,
  args: { label: '계정 이름' },
} satisfies Meta<typeof AccountSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// 번치 대표 이미지(Figma `AccountSwitcher`). 저장소에 이미지 에셋이 없어 데이터 주소 SVG 사용
export const WithAvatar: Story = {
  args: {
    label: '여행가조',
    avatarSrc:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="%23a7adff"/><circle cx="28" cy="26" r="14" fill="white"/></svg>',
  },
};

export const LongLabel: Story = {
  args: { label: '아주아주아주아주 긴 계정 이름이 들어가는 경우' },
  decorators: [(Story) => <div style={{ width: 200 }}>{Story()}</div>],
};

export const Disabled: Story = {
  args: { disabled: true },
};

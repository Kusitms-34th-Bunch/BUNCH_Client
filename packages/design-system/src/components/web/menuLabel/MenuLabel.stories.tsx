import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineTrashcanIcon } from '../../../icons';
import { MenuLabel, type MenuLabelButtonProps } from './MenuLabel';

const meta = {
  title: 'Web/ListItem/MenuLabel',
  component: MenuLabel,
  args: { children: '프로필 편집' },
  decorators: [(Story) => <div className="w-85.75">{Story()}</div>],
} satisfies Meta<MenuLabelButtonProps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 긴 글자는 단어 단위 줄바꿈, 화살표는 축소 없음 */
export const LongText: Story = {
  args: { children: '번치에서 나가고 내가 올린 사진과 번들 정리하기' },
};

/** 앞 아이콘(Figma `Show Left Icon`) */
export const WithLeftIcon: Story = {
  args: { children: '번치 삭제', leftIcon: <LineTrashcanIcon /> },
};

/** 화살표 없음(Figma `Show Right Icon` 끔) */
export const WithoutChevron: Story = {
  args: { showChevron: false },
};

/** 비활성(Figma Disabled): 전체 40%, 글자·아이콘 disabled 색 */
export const Disabled: Story = {
  args: { disabled: true, leftIcon: <LineTrashcanIcon /> },
};

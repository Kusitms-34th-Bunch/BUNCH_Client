import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { BundleCommentCard, type BundleCommentCardProps } from './BundleCommentCard';

/** 예시 프로필 사진(연한 하늘색 배경의 원) */
const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#d9ecf5"/><circle cx="24" cy="20" r="9" fill="#f4f8fb"/><ellipse cx="24" cy="44" rx="15" ry="12" fill="#f4f8fb"/></svg>',
)}`;

const meta = {
  title: 'Web/BundleCommentCard',
  component: BundleCommentCard,
  args: { userName: '지예', currentUser: true, profileSrc: SAMPLE_IMAGE, readOnly: false },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-86">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BundleCommentCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `State=Default`: 안내 문구만 보이는 빈 입력 */
export const Default: Story = {};

/** Figma `State=Filled`: 입력된 코멘트 */
export const Filled: Story = {
  args: { defaultValue: '퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! ' },
};

/** Figma `State=Error`: 긴 코멘트는 줄바꿈되고 카드 아래에 오류 안내 */
export const Error: Story = {
  args: {
    defaultValue: '퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! 퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! ',
    error: '입력 가능한 글자수를 초과했어요',
  },
};

/** Figma `State=Editing`: 다른 멤버가 쓰는 중 */
export const Editing: Story = {
  args: { editing: true, editingLabel: '지예님이 작성 중', currentUser: false },
};

/** 내 코멘트가 아니면 이름 뒤에 "(나)"가 없음 */
export const OtherMember: Story = { args: { userName: '경진', currentUser: false } };

const InteractiveCard = (args: BundleCommentCardProps) => {
  const [value, setValue] = useState('');
  return (
    <BundleCommentCard
      {...args}
      value={value}
      error={value.length > 40 ? '입력 가능한 글자수를 초과했어요' : undefined}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

/** 직접 입력해 Focused·Filled·Error(40자 초과)를 확인하기 */
export const Interactive: Story = { render: (args) => <InteractiveCard {...args} /> };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Dropdown, type DropdownSize } from './Dropdown';

const meta = {
  title: 'Admin/Selection/Dropdown',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const REASONS = [
  { value: 'all', label: '전체' },
  { value: 'spam', label: '스팸' },
  { value: 'adult', label: '음란・부적절한 내용' },
  { value: 'abuse', label: '괴롭힘・욕설' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'etc', label: '기타' },
];

const Example = ({
  size,
  initial = null,
  disabled = false,
  width,
}: {
  size: DropdownSize;
  initial?: string | null;
  disabled?: boolean;
  width: string;
}) => {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <div className={width}>
      <Dropdown
        aria-label="신고 사유"
        size={size}
        items={REASONS}
        value={value}
        onValueChange={setValue}
        placeholder={size === 'lg' ? '신고 사유를 선택해주세요' : '선택해주세요'}
        disabled={disabled}
      />
    </div>
  );
};

/** Size=L(폼 입력, Figma 폭 596px): 선택 전·선택 후·비활성. 눌러서 펼침(Open) */
export const Large: Story = {
  render: () => (
    <div className="gap-s6 flex flex-col">
      <Example size="lg" width="w-149" />
      <Example size="lg" width="w-149" initial="spam" />
      <Example size="lg" width="w-149" disabled />
    </div>
  ),
};

/** Size=S(목록 필터, Figma 폭 160px) */
export const Small: Story = {
  render: () => (
    <div className="gap-s6 flex flex-col">
      <Example size="sm" width="w-40" />
      <Example size="sm" width="w-40" initial="all" />
      <Example size="sm" width="w-40" disabled />
    </div>
  ),
};

/** 화면설계서 「번치 스팟 관리」 필터처럼 197px 폭의 L 드롭다운 */
export const Filter: Story = {
  render: () => <Example size="lg" width="w-49.25" initial="all" />,
};

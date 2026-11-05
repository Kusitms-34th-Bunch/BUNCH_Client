import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineChevronLeftIcon, LineMenuIcon, LineSearchIcon, LineSettingIcon } from '../../../icons';
import { TextButton } from '../textButton';
import { Header } from './Header';

// 아이콘 버튼은 터치 영역 48px(아이콘 24px 기준, docs/architecture/design-system-icons.md)
const IconButton = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    className="-mx-s6 size-s18 text-icon-primary inline-flex cursor-pointer items-center justify-center"
  >
    {children}
  </button>
);

const meta = {
  title: 'Components/Header',
  component: Header,
  args: { title: '제목' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

const back = (
  <IconButton label="뒤로 가기">
    <LineChevronLeftIcon size="lg" />
  </IconButton>
);

export const Default: Story = {};

export const BackAndTitle: Story = { args: { leading: back } };

export const WithIcons: Story = {
  args: {
    leading: back,
    trailing: (
      <>
        <IconButton label="검색">
          <LineSearchIcon size="lg" />
        </IconButton>
        <IconButton label="메뉴">
          <LineMenuIcon size="lg" />
        </IconButton>
        <IconButton label="설정">
          <LineSettingIcon size="lg" />
        </IconButton>
      </>
    ),
  },
};

export const WithTextButton: Story = {
  args: { leading: back, trailing: <TextButton size="sm">버튼</TextButton> },
};

export const LongTitle: Story = {
  args: {
    leading: back,
    title: '아주 아주 긴 제목이 들어와도 한 줄로 잘리고 오른쪽 버튼을 밀어내지 않아야 합니다',
    trailing: <TextButton size="sm">버튼</TextButton>,
  },
};

export const TrailingOnly: Story = {
  args: {
    title: undefined,
    leading: <span className="typography-heading-2-semibold">왼쪽 영역</span>,
    trailing: (
      <IconButton label="설정">
        <LineSettingIcon size="lg" />
      </IconButton>
    ),
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { GraphicEntryCreateIcon, GraphicEntryJoinIcon } from '../../../icons';
import { EntryCard } from './EntryCard';

// Storybook에는 앱의 public 폴더가 없어 사진 주소를 외부 의존 없는 단색 SVG data URI로 대체
const placeholderImage = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="686" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a566"/><stop offset="1" stop-color="#4a5d2b"/></linearGradient></defs><rect width="686" height="420" fill="url(#g)"/></svg>',
)}`;

const meta = {
  title: 'Web/Card/EntryCard',
  component: EntryCard,
  args: {
    title: '새 번치 만들기',
    description: '친구들을 초대하고 함께한 순간을 기록해봐요',
    imageSrc: placeholderImage,
    graphic: <GraphicEntryCreateIcon />,
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EntryCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Create: Story = {};

export const Join: Story = {
  args: {
    title: '초대 받은 번치 참여하기',
    description: '번치에 참여해 함께한 순간을 기록해봐요',
    graphic: <GraphicEntryJoinIcon />,
  },
};

/** 누르고 있는 동안 사진이 어두워진다. 스냅샷에서는 제외하고 직접 눌러서 확인 */
export const Pressable: Story = { parameters: { chromatic: { disableSnapshot: true } } };

export const LongText: Story = {
  args: {
    title: '아주 긴 진입 카드 이름이 들어가도 줄바꿈되어 모두 보인다',
    description:
      '설명이 길어도 말줄임 없이 여러 줄로 보여 준다. 카드 높이는 최소 210px이고 내용만큼 늘어난다',
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

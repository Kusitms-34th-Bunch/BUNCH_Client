import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineDotsMediumIcon } from '../../../icons';
import { BundleAuthorInfo, type BundleAuthorInfoProps } from './BundleAuthorInfo';

const members = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버${index + 1}` }));

const meta = {
  title: 'Web/Feed/BundleAuthorInfo',
  component: BundleAuthorInfo,
  decorators: [
    (Story) => (
      <div className="w-93.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<BundleAuthorInfoProps>;

export default meta;

type Story = StoryObj<BundleAuthorInfoProps>;

/** Figma `Variant=Default` */
export const Default: Story = {
  args: {
    bunchName: '여행가조',
    time: '2일 전',
    onBunchClick: () => {},
    members: members(7),
    onMembers: () => {},
  },
};

/** 긴 번치 이름은 한 줄 말줄임 */
export const LongName: Story = {
  args: { ...Default.args, bunchName: '이름이 아주 길어서 한 줄에 다 들어가지 않는 번치' },
};

/** Figma `Variant=Ad`. 오른쪽 버튼은 호출자가 넣음(예시는 더보기 아이콘만) */
export const Ad: Story = {
  args: {
    variant: 'ad',
    badge: 'BUNCH SPOT',
    tagline: '여기서 뭉쳐봐요!',
    actions: <LineDotsMediumIcon aria-hidden className="text-icon-primary" />,
  },
};

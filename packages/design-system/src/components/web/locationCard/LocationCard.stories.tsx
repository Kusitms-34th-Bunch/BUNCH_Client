import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LocationCard } from './LocationCard';

const meta = {
  title: 'Components/LocationCard',
  component: LocationCard,
  args: {
    placeName: '봄날카페',
    address: '제주 제주시 애월읍',
    source: '여행가조',
    bundleTitle: '제주 3박 4일',
    onClick: fn(),
    onMore: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LocationCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Status=Default`. 누르는 동안은 `Status2`(검정 10% 겹침) */
export const Default: Story = {};

/** 광고(BUNCH PICK)에서 콕한 장소: 출처 한 문구, 담아 온 번들이 없어 누르지 않음 */
export const FromBunchPick: Story = {
  args: { source: 'BUNCH PICK' },
  render: ({ onClick: _onClick, bundleTitle: _bundleTitle, ...args }) => <LocationCard {...args} />,
};

/** 원래 번들을 볼 수 없는 장소: 출처 자리에 안내 문구, 누르면 호출자가 안내 모달을 띄움 */
export const UnavailableBundle: Story = {
  args: { source: '볼 수 없는 번들이에요' },
  render: ({ bundleTitle: _bundleTitle, ...args }) => <LocationCard {...args} />,
};

/** 긴 이름·주소·출처는 한 줄 말줄임 */
export const LongText: Story = {
  args: {
    placeName: '제주 애월 바다가 보이는 아주 긴 이름의 브런치 카페 본점',
    address: '제주특별자치도 제주시 애월읍 애월해안로 272 1층 101호',
    source: '아주 긴 이름의 번치',
    bundleTitle: '제주 3박 4일 가족 여행 기록 첫째 날',
  },
};

/** 누름·더보기 없이 보여 주기만 할 때 */
export const Static: Story = {
  render: ({ onClick: _onClick, onMore: _onMore, ...args }) => <LocationCard {...args} />,
};

export const List: Story = {
  render: (args) => (
    <ul className="gap-s4 flex flex-col">
      <li>
        <LocationCard {...args} />
      </li>
      <li>
        <LocationCard {...args} placeName="애월 한담해변" address="제주 제주시 애월읍 곽지리" />
      </li>
    </ul>
  ),
};

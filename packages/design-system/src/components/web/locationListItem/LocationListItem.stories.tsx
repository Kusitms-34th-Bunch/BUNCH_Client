import type { Meta, StoryObj } from '@storybook/react-vite';
import { LocationListItem } from './LocationListItem';

const meta = {
  title: 'Web/LocationListItem',
  component: LocationListItem,
  args: { placeName: '여의도한강공원', address: '서울특별시 영등포구 여의동로 330' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-93.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LocationListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `LocationListItem`: 장소 이름·주소와 아래 구분선 */
export const Default: Story = {};

/** 긴 이름과 주소는 한 줄로 줄임 */
export const LongText: Story = {
  args: {
    placeName: '여의도한강공원 물빛광장 옆 야외 피크닉 장소와 자전거 대여소 앞 광장',
    address: '서울특별시 영등포구 여의동로 330 한강사업본부 여의도안내센터 인근 한강변 공원 지구',
  },
};

/** 목록으로 여러 줄을 쌓은 모양 */
export const List: Story = {
  render: () => (
    <ul>
      {[
        ['여의도한강공원', '서울특별시 영등포구 여의동로 330'],
        ['여의도공원', '서울특별시 영등포구 여의공원로 68'],
        ['IFC몰', '서울특별시 영등포구 국제금융로 10'],
      ].map(([placeName, address]) => (
        <li key={placeName}>
          <LocationListItem placeName={placeName as string} address={address as string} />
        </li>
      ))}
    </ul>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  FillConfettiLargeIcon,
  FillHomeLargeIcon,
  FillPhotoLargeIcon,
  FillUserLargeIcon,
  LineConfettiLargeIcon,
  LineHomeLargeIcon,
  LinePhotoLargeIcon,
  LineUserLargeIcon,
} from '../../../icons';
import { BottomNavigation, type BottomNavigationItem } from './BottomNavigation';

const items: BottomNavigationItem[] = [
  { id: 'feed', label: '피드', icon: <LineHomeLargeIcon />, selectedIcon: <FillHomeLargeIcon /> },
  {
    id: 'photos',
    label: '사진함',
    icon: <LinePhotoLargeIcon />,
    selectedIcon: <FillPhotoLargeIcon />,
  },
  {
    id: 'bunch',
    label: '번치',
    icon: <LineConfettiLargeIcon />,
    selectedIcon: <FillConfettiLargeIcon />,
  },
  {
    id: 'my',
    label: '마이페이지',
    icon: <LineUserLargeIcon />,
    selectedIcon: <FillUserLargeIcon />,
  },
];

const meta = {
  title: 'Web/BottomNavigation',
  component: BottomNavigation,
  args: { 'aria-label': '주요 메뉴', items, selectedId: 'feed' },
  argTypes: {
    selectedId: { control: 'inline-radio', options: items.map((item) => item.id) },
  },
  decorators: [(Story) => <div className="bg-surface-secondary p-s8 w-93.75">{Story()}</div>],
} satisfies Meta<typeof BottomNavigation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Figma `BottomNavigation` 변형 4개와 같은 배치: 탭마다 선택된 모습 */
export const Matrix: Story = {
  render: (args) => (
    <div className="gap-s12 flex flex-col">
      {items.map((item) => (
        <BottomNavigation key={item.id} {...args} selectedId={item.id} />
      ))}
    </div>
  ),
};

const InteractiveExample = (args: React.ComponentProps<typeof BottomNavigation>) => {
  const [selectedId, setSelectedId] = useState(args.selectedId);
  return <BottomNavigation {...args} selectedId={selectedId} onItemSelect={setSelectedId} />;
};

/** 누른 항목이 선택되는 모습(키보드 Tab·Enter도 확인). 스냅샷에서는 제외 */
export const Interactive: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: (args) => <InteractiveExample {...args} />,
};

/** 긴 라벨의 한 줄 말줄임·항목 겹침 확인 */
export const LongLabel: Story = {
  args: {
    items: items.map((item) => ({ ...item, label: `${item.label}가 아주 긴 이름` })),
  },
};

/** 좁은 폭에서 알약의 항목 폭 축소 확인 */
export const Narrow: Story = {
  decorators: [(Story) => <div className="w-70">{Story()}</div>],
};

// 토스·배민처럼 밝은 화면(흰 카드, 글자, 파란 버튼) 위에서의 모습을 보기 위한 배경
const ContentBackground = () => (
  <div className="flex flex-col gap-3 bg-[#f2f4f6] p-4">
    {[1, 2, 3, 4, 5].map((n) => (
      <div key={n} className="flex flex-col gap-3 rounded-3xl bg-white p-5">
        <div className="text-lg font-bold text-[#191f28]">오늘의 미션 {n}</div>
        <div className="text-sm text-[#6b7684]">2개 방문하면 포인트 받아요</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#e8f3ff]" />
            <span className="text-base font-semibold text-[#191f28]">행운복권</span>
          </div>
          <span className="rounded-xl bg-[#3182f6] px-4 py-2 text-sm font-semibold text-white">
            방문하기
          </span>
        </div>
      </div>
    ))}
  </div>
);

/** 밝은 화면 위 글라스 효과·스크롤 확인, 스냅샷 제외 */
export const Glass: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  args: { glass: true },
  render: (args) => <InteractiveExample {...args} />,
  decorators: [
    (Story) => (
      <div className="relative h-120 w-full overflow-y-auto">
        <ContentBackground />
        <div className="bottom-s6 px-s4 sticky -mt-16">
          <Story />
        </div>
      </div>
    ),
  ],
};

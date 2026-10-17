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
  decorators: [(Story) => <div className="bg-surface-secondary p-s8 w-[375px]">{Story()}</div>],
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

/** 라벨이 길어도 한 줄로 잘리고 항목이 겹치지 않는다 */
export const LongLabel: Story = {
  args: {
    items: items.map((item) => ({ ...item, label: `${item.label}가 아주 긴 이름` })),
  },
};

/** 좁은 폭에서 알약이 항목 폭만큼 줄어든다 */
export const Narrow: Story = {
  decorators: [(Story) => <div className="w-[280px]">{Story()}</div>],
};

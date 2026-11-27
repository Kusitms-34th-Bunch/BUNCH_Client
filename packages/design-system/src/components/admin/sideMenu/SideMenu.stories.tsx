import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { LineAlertMediumIcon } from '../../../icons';
import { SideMenu } from './SideMenu';

// href·renderLink 유니온은 Storybook args 타입이 풀지 못해 기본 <a>(href) 쪽으로 좁힘
type SideMenuStoryArgs = Extract<ComponentProps<typeof SideMenu>, { href: string }>;

const meta = {
  title: 'Admin/Navigation/SideMenu',
  component: SideMenu,
  render: (args) => <SideMenu {...args} />,
  args: {
    icon: <LineAlertMediumIcon />,
    children: '신고 조회 및 처리',
    count: 12,
    href: '/reports',
  },
  decorators: [
    // Figma 사이드바 폭 248px. 링크를 눌러도 Storybook 화면이 이동하지 않게 기본 동작 차단
    (Story) => (
      <div
        className="w-62"
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest('a')) event.preventDefault();
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<SideMenuStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default(Hover는 마우스를 올려 확인) */
export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };

export const WithoutCount: Story = { args: { count: undefined } };

/** 긴 이름은 한 줄로 두고 말줄임, 배지는 줄지 않음 */
export const LongLabel: Story = {
  args: { children: '신고 조회 및 처리와 회원 정지 이력 관리', count: 1280 },
};

const MENU = [
  { path: '/members', label: '회원 조회 및 정지' },
  { path: '/reports', label: '신고 조회 및 처리', count: 12 },
  { path: '/spots', label: '번치 스팟 관리' },
] as const;

const MenuExample = () => {
  const [current, setCurrent] = useState<string>('/reports');
  return (
    <nav aria-label="어드민 메뉴" className="gap-s2 flex flex-col">
      {MENU.map((item) => (
        <SideMenu
          key={item.path}
          icon={<LineAlertMediumIcon />}
          count={'count' in item ? item.count : undefined}
          selected={current === item.path}
          // 앱에서는 라우터 Link가 이동과 현재 화면 판정을 맡음. story는 이동 대신 선택만 바꿈
          renderLink={({ children, ...state }) => (
            <a {...state} href={item.path} onClick={() => setCurrent(item.path)}>
              {children}
            </a>
          )}
        >
          {item.label}
        </SideMenu>
      ))}
    </nav>
  );
};

/** 메뉴 묶음: 누르면 이동하지 않고 선택된 항목만 바뀜(앱에서는 화면 이동) */
export const Menu: Story = { render: () => <MenuExample /> };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { MenuTabs } from './MenuTabs';

const meta = {
  title: 'Web/MenuTabs',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma `Menu_Tap`: 팔로워·팔로잉 탭과 패널 */
export const Default: Story = {
  render: () => (
    <MenuTabs.Root defaultValue="followers">
      <MenuTabs.List aria-label="팔로우 목록">
        <MenuTabs.Tab value="followers" label="팔로워" count={120} />
        <MenuTabs.Tab value="following" label="팔로잉" count={120} />
      </MenuTabs.List>
      <MenuTabs.Panel value="followers" className="py-padding-p8">
        팔로워 목록
      </MenuTabs.Panel>
      <MenuTabs.Panel value="following" className="py-padding-p8">
        팔로잉 목록
      </MenuTabs.Panel>
    </MenuTabs.Root>
  ),
};

export const WithoutCount: Story = {
  render: () => (
    <MenuTabs.Root defaultValue="photos">
      <MenuTabs.List aria-label="보기">
        <MenuTabs.Tab value="photos" label="사진" />
        <MenuTabs.Tab value="bundles" label="번들" />
      </MenuTabs.List>
    </MenuTabs.Root>
  ),
};

/** 비활성 탭: 흐림(40%), 누르거나 방향키로 선택할 수 없음 */
export const WithDisabledTab: Story = {
  render: () => (
    <MenuTabs.Root defaultValue="followers">
      <MenuTabs.List aria-label="팔로우 목록">
        <MenuTabs.Tab value="followers" label="팔로워" count={120} />
        <MenuTabs.Tab value="following" label="팔로잉" count={0} disabled />
      </MenuTabs.List>
    </MenuTabs.Root>
  ),
};

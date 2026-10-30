import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginButton, type LoginButtonBrand } from './LoginButton';

const labels: Record<LoginButtonBrand, string> = {
  google: 'Google로 계속하기',
  kakao: '카카오 로그인',
  apple: 'Apple로 계속하기',
};
const brands = Object.keys(labels) as LoginButtonBrand[];

const meta = {
  title: 'Web/LoginButton',
  component: LoginButton,
  args: { brand: 'google', children: labels.google },
  argTypes: {
    brand: { control: 'inline-radio', options: brands },
    disabled: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LoginButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Brands: Story = {
  render: () => (
    <div className="space-y-s6">
      {brands.map((brand) => (
        <LoginButton key={brand} brand={brand}>
          {labels[brand]}
        </LoginButton>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-s6">
      {brands.map((brand) => (
        <LoginButton key={brand} brand={brand} disabled>
          {labels[brand]}
        </LoginButton>
      ))}
    </div>
  ),
};

export const LongLabel: Story = {
  args: { children: '아주 긴 문구가 들어와도 한 줄로 잘리고 버튼 밖으로 넘치지 않아야 합니다' },
};

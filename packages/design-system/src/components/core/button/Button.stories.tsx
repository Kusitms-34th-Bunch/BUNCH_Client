import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, type ButtonSize, type ButtonVariant } from './Button';

const variants: ButtonVariant[] = [
  'primary',
  'secondary',
  'tertiary',
  'warning',
  'brand',
  'brandSubtle',
];
const sizes: ButtonSize[] = ['lg', 'md', 'sm'];

const ChevronLeft = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

const meta = {
  title: 'Components/Button',
  component: Button,
  args: {
    children: 'BUTTON',
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'inline-radio', options: sizes },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Figma 변형×크기 표와 같은 배치(눌림 :active는 직접 확인) */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      {[false, true].map((disabled) => (
        <div key={String(disabled)} style={{ display: 'grid', gap: 12 }}>
          <strong>{disabled ? 'Disabled' : 'Default'}</strong>
          {variants.map((variant) => (
            <div key={variant} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 96 }}>{variant}</span>
              {sizes.map((size) => (
                <Button key={size} variant={variant} size={size} disabled={disabled}>
                  BUTTON
                </Button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const WithIcons: Story = {
  args: { leftIcon: <ChevronLeft />, rightIcon: <ChevronLeft /> },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/** 좁은 폭 나란히 배치(폭은 호출 쪽이 지정) */
export const SideBySide: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, width: 240 }}>
      <Button variant="secondary" className="min-w-0 flex-1">
        취소하고 돌아가기
      </Button>
      <Button className="min-w-0 flex-1">확인했습니다 다음으로</Button>
    </div>
  ),
};

/** 부모 폭을 넘는 긴 글자의 말줄임 */
export const LongLabel: Story = {
  args: { children: '아주 아주 긴 버튼 이름이 들어오는 경우에도 부모 폭을 넘지 않는다' },
  render: (args) => (
    <div style={{ width: 200 }}>
      <Button {...args} />
    </div>
  ),
};

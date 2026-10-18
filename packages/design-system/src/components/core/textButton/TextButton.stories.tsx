import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineChevronLeftIcon } from '../../../icons';
import { TextButton, type TextButtonSize, type TextButtonVariant } from './TextButton';

const variants: TextButtonVariant[] = ['primary', 'secondary', 'warning'];
const sizes: TextButtonSize[] = ['lg', 'md', 'sm'];

const meta = {
  title: 'Components/TextButton',
  component: TextButton,
  args: {
    children: 'BUTTON',
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'inline-radio', options: sizes },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof TextButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Figma variant×size 표와 같은 배치(눌림 :active는 직접 확인) */
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
                <TextButton key={size} variant={variant} size={size} disabled={disabled}>
                  BUTTON
                </TextButton>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {sizes.map((size) => (
        <TextButton
          key={size}
          {...args}
          size={size}
          leftIcon={<LineChevronLeftIcon size={size} />}
          rightIcon={<LineChevronLeftIcon size={size} />}
        />
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
};

/** 좁은 폭 나란히 배치(폭은 호출 쪽이 지정) */
export const SideBySide: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, width: 240 }}>
      <TextButton variant="secondary" className="min-w-0 flex-1">
        취소하고 돌아가기
      </TextButton>
      <TextButton variant="primary" className="min-w-0 flex-1">
        확인했습니다 다음으로
      </TextButton>
    </div>
  ),
};

/** 부모 폭을 넘는 긴 글자의 말줄임 */
export const LongLabel: Story = {
  args: { children: '아주 아주 긴 버튼 이름이 들어오는 경우에도 부모 폭을 넘지 않는다' },
  render: (args) => (
    <div style={{ width: 200 }}>
      <TextButton {...args} />
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineAlertIcon } from '../../../icons';
import { ErrorBanner } from './ErrorBanner';

const meta = {
  title: 'Web/ErrorBanner',
  component: ErrorBanner,
  args: { children: '연결이 끊겼어요.', actionLabel: '재시도' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-93.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Page Banner`: 연결 끊김 아이콘 + 문구 + 밑줄 "재시도" 버튼 */
export const Default: Story = {};

/** 오른쪽 버튼 없이 문구만 */
export const WithoutAction: Story = { args: { actionLabel: undefined } };

/** 다른 아이콘으로 바꾸기 */
export const CustomIcon: Story = {
  args: { icon: <LineAlertIcon size="md" aria-hidden="true" />, children: '저장하지 못했어요.' },
};

/** 긴 문구는 줄바꿈하고 버튼은 오른쪽에 그대로 */
export const LongMessage: Story = {
  args: {
    children: '네트워크 연결이 불안정해서 사진을 올리지 못했어요. 잠시 뒤에 다시 시도해 주세요.',
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { CameraButton } from './CameraButton';

const meta = {
  title: 'Web/CameraButton',
  component: CameraButton,
  args: { 'aria-label': '프로필 사진 변경' },
  argTypes: { disabled: { control: 'boolean' } },
} satisfies Meta<typeof CameraButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const States: Story = {
  render: (args) => (
    <div className="gap-s8 flex items-center">
      <CameraButton {...args} />
      <CameraButton {...args} disabled />
    </div>
  ),
};

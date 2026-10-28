import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddBundlePhoto } from './AddBundlePhoto';

const meta = {
  title: 'Web/AddBundlePhoto',
  component: AddBundlePhoto,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AddBundlePhoto>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Size=M, Type=Add`(330px) */
export const Default: Story = {};

/** Figma `Size=S, Type=Add`(300px) */
export const Small: Story = { args: { size: 's' } };

/** 글자를 바꾸기 */
export const CustomLabel: Story = { args: { label: '번들에 사진 넣기' } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddBundlePhotoEditor } from './AddBundlePhotoEditor';

const meta = {
  title: 'Web/Photo/AddBundlePhotoEditor',
  component: AddBundlePhotoEditor,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AddBundlePhotoEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Size=M, Type=Add`(330px) */
export const Default: Story = {};

/** Figma `State=Empty`(130px) */
export const ExtraSmall: Story = { args: { size: 'xs' } };

/** 글자를 바꾸기 */
export const CustomLabel: Story = { args: { label: '번들에 사진 넣기' } };

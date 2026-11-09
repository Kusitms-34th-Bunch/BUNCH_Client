import type { Meta, StoryObj } from '@storybook/react-vite';
import { BundlePickPhoto } from './BundlePickPhoto';

const meta = {
  title: 'Web/Photo/BundlePickPhoto',
  component: BundlePickPhoto,
  args: { src: 'https://picsum.photos/seed/bunch/590/792', alt: '달리는 사람들' },
} satisfies Meta<typeof BundlePickPhoto>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

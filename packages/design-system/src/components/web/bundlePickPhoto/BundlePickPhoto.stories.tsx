import type { Meta, StoryObj } from '@storybook/react-vite';
import { BundlePickPhoto } from './BundlePickPhoto';

/** 예시 사진(하늘과 길의 그라데이션) */
const SAMPLE_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="590" height="786"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fc7e6"/><stop offset="0.55" stop-color="#c9d4dc"/><stop offset="1" stop-color="#7d7468"/></linearGradient></defs><rect width="590" height="786" fill="url(#g)"/></svg>',
)}`;

const meta = {
  title: 'Web/Photo/BundlePickPhoto',
  component: BundlePickPhoto,
  args: { src: SAMPLE_PHOTO, alt: '러닝하는 사람들' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof BundlePickPhoto>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 295×393 */
export const Default: Story = {};

/** 가운데가 아닌 사진은 흐리게 */
export const Dimmed: Story = { args: { className: 'opacity-(--semantic-opacity-disabled)' } };

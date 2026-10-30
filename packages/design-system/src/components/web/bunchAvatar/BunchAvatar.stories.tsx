import type { Meta, StoryObj } from '@storybook/react-vite';
import { BunchAvatar } from './BunchAvatar';

// 스토리용 자리표시 이미지. 실제 기본 이미지는 호출하는 쪽이 전달
const sample =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><rect width='160' height='160' fill='%23A7ADFF'/><ellipse cx='80' cy='120' rx='60' ry='36' fill='white'/><circle cx='80' cy='86' r='34' fill='white'/></svg>";

const meta = {
  title: 'Web/BunchAvatar',
  component: BunchAvatar,
  args: { src: sample, alt: '번치 대표 이미지', onCameraClick: () => {} },
} satisfies Meta<typeof BunchAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 카메라 버튼이 없는 읽기 전용 */
export const WithoutCamera: Story = {
  render: () => <BunchAvatar src={sample} alt="번치 대표 이미지" />,
};

/** src가 없을 때: 이미지 없는 빈 원 */
export const Empty: Story = { args: { src: undefined } };

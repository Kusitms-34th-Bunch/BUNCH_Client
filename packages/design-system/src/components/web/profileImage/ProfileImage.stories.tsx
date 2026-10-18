import type { Meta, StoryObj } from '@storybook/react-vite';
import { CameraButton } from '../cameraButton';
import { ProfileImage } from './ProfileImage';

// 스토리용 자리표시 이미지. 실제 기본 이미지(번치 대표 이미지)와 선택한 이미지는 호출하는 쪽이 넘긴다
const defaultImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><rect width='160' height='160' fill='%23A7ADFF'/><ellipse cx='80' cy='120' rx='60' ry='36' fill='white'/><circle cx='80' cy='86' r='34' fill='white'/></svg>";
const pickedImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><rect width='160' height='160' fill='%23FFD8A8'/><circle cx='80' cy='70' r='30' fill='%23F59F00'/><rect x='30' y='110' width='100' height='60' rx='30' fill='%23F59F00'/></svg>";

const meta = {
  title: 'Web/ProfileImage',
  component: ProfileImage,
  args: { src: defaultImage, alt: '기본 프로필 사진' },
} satisfies Meta<typeof ProfileImage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Picked: Story = { args: { src: pickedImage, alt: '선택한 프로필 사진' } };

export const NoImage: Story = { args: { src: undefined } };

// 설계서 구성: 프로필 이미지 오른쪽 아래에 카메라 버튼(95×90 영역에 67·62 위치)
export const WithCameraButton: Story = {
  render: (args) => (
    <div className="relative h-22.5 w-23.75">
      <ProfileImage {...args} className="absolute top-0 left-0.75" />
      <CameraButton aria-label="프로필 사진 변경" className="absolute top-15.5 left-16.75" />
    </div>
  ),
};

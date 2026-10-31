import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddBundlePhoto } from '../addBundlePhoto';
import { BundlePhoto } from './BundlePhoto';

/** 예시 사진(하늘과 길의 그라데이션) */
const SAMPLE_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="660" height="660"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fc7e6"/><stop offset="0.55" stop-color="#c9d4dc"/><stop offset="1" stop-color="#7d7468"/></linearGradient></defs><rect width="660" height="660" fill="url(#g)"/></svg>',
)}`;

/** 예시 프로필 사진(연한 하늘색 배경의 원) */
const SAMPLE_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62"><rect width="62" height="62" fill="#d9ecf5"/><circle cx="31" cy="26" r="11" fill="#f4f8fb"/><ellipse cx="31" cy="57" rx="19" ry="15" fill="#f4f8fb"/></svg>',
)}`;

const meta = {
  title: 'Web/BundlePhoto',
  component: BundlePhoto,
  args: { src: SAMPLE_PHOTO, alt: '러닝하는 사람들' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof BundlePhoto>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `Size=M, Type=Photo`(330px): 올린 멤버 아바타와 삭제 버튼이 얹힘 */
export const Default: Story = {
  args: { uploader: { name: '지예', src: SAMPLE_AVATAR }, onDelete: () => {} },
};

/** Figma `Size=M, Type=Photo` 전체: 아바타·삭제 버튼·왼쪽 아래 페이지 표시(`1/4`) */
export const WithPage: Story = {
  args: {
    uploader: { name: '지예', src: SAMPLE_AVATAR },
    onDelete: () => {},
    page: { current: 1, total: 4 },
  },
};

/** Figma `Size=S, Type=Photo`(300px): 사진만 */
export const Small: Story = { args: { size: 's' } };

/** 삭제 버튼만(아바타 없이, Figma `avater=false`) */
export const DeleteOnly: Story = { args: { onDelete: () => {} } };

/** 올린 멤버 아바타만 */
export const UploaderOnly: Story = { args: { uploader: { name: '지예', src: SAMPLE_AVATAR } } };

/** 프로필 사진이 없는 멤버는 배경색 원으로 보임 */
export const UploaderWithoutImage: Story = {
  args: { uploader: { name: '지예' }, onDelete: () => {} },
};

/** Figma `Bundle Photo` 4종(Photo M·S, Add M·S)과 얹힘 조합을 한눈에 보기 */
export const Matrix: Story = {
  render: (args) => (
    <div className="gap-s8 flex flex-col">
      <div className="gap-s8 flex items-start">
        <BundlePhoto
          {...args}
          size="m"
          uploader={{ name: '지예', src: SAMPLE_AVATAR }}
          onDelete={() => {}}
          page={{ current: 1, total: 4 }}
        />
        <BundlePhoto {...args} size="s" />
      </div>
      <div className="gap-s8 flex items-start">
        <AddBundlePhoto size="m" />
        <AddBundlePhoto size="s" />
      </div>
    </div>
  ),
};

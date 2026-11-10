import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AdPhotoCard, type AdPhotoCardProps } from './AdPhotoCard';

const photo = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="343" height="429"><rect width="343" height="429" fill="#6f8f6a"/><rect y="140" width="343" height="160" fill="#a8c49a"/></svg>')}`;

const meta = {
  title: 'Web/Feed/AdPhotoCard',
  component: AdPhotoCard,
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<AdPhotoCardProps>;

export default meta;

type Story = StoryObj<AdPhotoCardProps>;

/** Figma `State=Default`(콕하기를 누르면 「콕 했어요」) */
export const Default: Story = {
  args: {
    title: '플로디스튜디오',
    imageSrc: photo,
    tagline: '여기서 뭉쳐봐요!',
    description: '도자기 원데이 클래스',
    location: '서울숲역 도보 7분 , 뚝섬역 도보 9분',
    tags: ['최대 4인', '1인 5~6만원', '예약 가능', '프라이빗 클래스'],
    picked: false,
    onPick: () => {},
    onMore: () => {},
  },
  render: function Render(args: AdPhotoCardProps) {
    const [picked, setPicked] = useState(false);
    return args.state === 'hidden' ? (
      <AdPhotoCard {...args} />
    ) : (
      <AdPhotoCard {...args} picked={picked} onPick={() => setPicked(!picked)} />
    );
  },
};

/** Figma `State=Hidden`(체크 모션은 처음 그릴 때 한 번) */
export const Hidden: Story = { args: { state: 'hidden', title: '플로디스튜디오' } };

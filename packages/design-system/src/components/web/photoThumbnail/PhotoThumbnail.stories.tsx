import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PhotoThumbnail } from './PhotoThumbnail';

// 저장소에 사진 에셋이 없어 그라데이션 SVG를 데이터 주소로 사용
const sample =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="246" height="246"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%236fa8c7"/><stop offset="1" stop-color="%23d8c3a5"/></linearGradient></defs><rect width="246" height="246" fill="url(%23g)"/></svg>';

const meta = {
  title: 'Web/PhotoThumbnail',
  component: PhotoThumbnail,
  args: { src: sample, alt: '바닷가를 달리는 사람들' },
} satisfies Meta<typeof PhotoThumbnail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SelectionMode: Story = { args: { selectionMode: true } };

export const Selected: Story = {
  args: { selectionMode: true, selected: true, selectionOrder: 1 },
};

// Selected × SelectionMode 세 가지 변형
export const Matrix: Story = {
  render: (args) => (
    <div className="gap-s8 flex">
      <PhotoThumbnail {...args} />
      <PhotoThumbnail {...args} selectionMode />
      <PhotoThumbnail {...args} selectionMode selected selectionOrder={1} />
    </div>
  ),
};
const SelectableGrid = ({ src, count = 9 }: { src: string; count?: number }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const toggle = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));

  return (
    <div className="gap-s2 grid w-[378px] grid-cols-3">
      {Array.from({ length: count }, (_, i) => i + 1).map((id) => {
        const order = selectedIds.indexOf(id) + 1;
        return (
          <PhotoThumbnail
            key={id}
            src={src}
            alt={`사진 ${id}`}
            selectionMode
            selected={order > 0}
            selectionOrder={order > 0 ? order : undefined}
            onClick={() => toggle(id)}
            className="w-full"
          />
        );
      })}
    </div>
  );
};

// 눌러서 고르는 동작 확인용: 선택 순서대로 번호가 붙고, 다시 누르면 해제되며 뒤 번호가 당겨짐
export const Interactive: Story = {
  render: (args) => <SelectableGrid src={args.src} />,
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SelectionFieldGroup, type SelectionFieldGroupItem } from './SelectionFieldGroup';

const meta = {
  title: 'Web/SelectionFieldGroup',
  component: SelectionFieldGroup,
  args: { fieldLabel: '위치', items: [] },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-94">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectionFieldGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => {};

/** Figma `Count=1`: 값 하나 + "추가" 행 */
export const Count1: Story = {
  args: { items: [{ id: 'a', value: '서울특별시 여의도동' }], onAdd: noop },
};

/** Figma `Count=2`: 값 둘 + "추가" 행 */
export const Count2: Story = {
  args: {
    items: [
      { id: 'a', value: '서울특별시 여의도동' },
      { id: 'b', value: '서울특별시 여의도동' },
    ],
    onAdd: noop,
  },
};

/** Figma `Count=3`: 최대 개수라 "추가" 행 없이 값 셋(Figma 가운데의 "위치 추가 >" 행은 만들지 않음, 장소는 검색 화면에서 고름) */
export const Count3: Story = {
  args: {
    items: [
      { id: 'a', value: '서울특별시 여의도동' },
      { id: 'b', value: '서울특별시 여의도동' },
      { id: 'c', value: '서울특별시 여의도동' },
    ],
  },
};

/** 행 하나뿐이면 일반 선택 필드(선택됨)와 같은 모양 */
export const OneRow: Story = { args: { items: [{ id: 'a', value: '서울특별시 여의도동' }] } };

const MAX_ITEMS = 3;
// 실제로는 "추가"를 누르면 장소 검색 화면이 열리고 고른 결과가 들어옴. 스토리에서는 목록에서 차례로 고른 것처럼 흉내
const SEARCH_RESULTS = ['서울특별시 여의도동', '부산광역시 해운대구', '제주특별자치도 제주시'];

const InteractiveGroup = () => {
  const [items, setItems] = useState<SelectionFieldGroupItem[]>([
    { id: '1', value: SEARCH_RESULTS[0] ?? '' },
  ]);
  return (
    <SelectionFieldGroup
      fieldLabel="위치"
      items={items}
      clearLabel={(value, index) => `${index + 1}번째 ${value} 지우기`}
      onAdd={
        items.length < MAX_ITEMS
          ? () =>
              setItems((prev) => [
                ...prev,
                { id: String(Date.now()), value: SEARCH_RESULTS[prev.length] ?? '' },
              ])
          : undefined
      }
      onItemClear={(id) => setItems((prev) => prev.filter((item) => item.id !== id))}
    />
  );
};

/** "추가"로 값을 더하고 지우기로 빼는 예(검색 화면과 최대 3개 제한은 호출하는 쪽) */
export const Interactive: Story = { render: () => <InteractiveGroup /> };

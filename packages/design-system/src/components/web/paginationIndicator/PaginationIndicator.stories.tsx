import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PaginationIndicator } from './PaginationIndicator';

const meta = {
  title: 'Web/PaginationIndicator',
  component: PaginationIndicator,
  args: { total: 8, current: 1 },
} satisfies Meta<typeof PaginationIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `CurrentPage=1`: 첫 페이지, 오른쪽 끝 점이 4px로 줄어 더 있음을 알림 */
export const Default: Story = {};

/** Figma `CurrentPage=4`: 중간 페이지, 양쪽 끝 점이 줄어 앞뒤에 더 있음을 알림 */
export const Middle: Story = { args: { current: 4 } };

/** Figma `CurrentPage=6`: 마지막 페이지, 왼쪽 끝 점만 줄어듦 */
export const Last: Story = { args: { current: 8 } };

/** 페이지가 6개 이하면 점마다 한 페이지이고 줄어든 점이 없음 */
export const FewPages: Story = { args: { total: 4, current: 2 } };

/** 페이지가 하나면 점 하나 */
export const SinglePage: Story = { args: { total: 1, current: 1 } };

/** 전체 8페이지에서 현재 페이지 1~8일 때 점 모양과, 6페이지 이하의 모양을 한눈에 보기 */
export const Matrix: Story = {
  render: () => (
    <div className="gap-s8 flex">
      <div className="gap-s4 flex flex-col">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((current) => (
          <div key={current} className="gap-s4 flex items-center">
            <span className="typography-caption-1-medium text-text-tertiary w-12">
              {current} / 8
            </span>
            <PaginationIndicator total={8} current={current} />
          </div>
        ))}
      </div>
      <div className="gap-s4 flex flex-col">
        {[
          [1, 1],
          [2, 2],
          [3, 1],
          [5, 3],
          [6, 6],
        ].map(([total, current]) => (
          <div key={`${total}-${current}`} className="gap-s4 flex items-center">
            <span className="typography-caption-1-medium text-text-tertiary w-12">
              {current} / {total}
            </span>
            <PaginationIndicator total={total as number} current={current as number} />
          </div>
        ))}
      </div>
    </div>
  ),
};

const InteractiveIndicator = () => {
  const [current, setCurrent] = useState(1);
  const total = 9;
  return (
    <div className="gap-s4 flex flex-col items-start">
      <PaginationIndicator total={total} current={current} />
      <div className="gap-s4 flex">
        <button
          type="button"
          className="typography-body-2-regular border-border-secondary px-s4 rounded-r3 border"
          onClick={() => setCurrent((page) => Math.max(1, page - 1))}
        >
          이전
        </button>
        <button
          type="button"
          className="typography-body-2-regular border-border-secondary px-s4 rounded-r3 border"
          onClick={() => setCurrent((page) => Math.min(total, page + 1))}
        >
          다음
        </button>
      </div>
    </div>
  );
};

/** 이전·다음을 눌러 9페이지에서 점이 움직이는 모양 보기 */
export const Interactive: Story = { render: () => <InteractiveIndicator /> };

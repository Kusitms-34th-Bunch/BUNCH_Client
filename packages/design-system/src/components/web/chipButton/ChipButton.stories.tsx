import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type ChipButtonSize, type ChipButtonVariant, ChipButton } from './ChipButton';

// 저장소에 아바타 에셋이 없어 그라데이션 SVG를 데이터 주소로 사용
const avatar =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23e6e2ec"/><circle cx="24" cy="20" r="9" fill="%23a7adff"/></svg>';

const meta = {
  title: 'Web/ChipButton',
  component: ChipButton,
  args: { children: '서울특별시', avatarSrc: avatar },
} satisfies Meta<typeof ChipButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };

export const Outline: Story = { args: { variant: 'outline', leftIcon: true, rightIcon: true } };

export const Avatar: Story = { args: { variant: 'avatar', rightIcon: true } };

export const WithCount: Story = { args: { count: 3, rightIcon: true } };

const sizes: ChipButtonSize[] = ['S', 'M', 'L'];
const variants: ChipButtonVariant[] = ['solid', 'outline', 'avatar'];

// Size × Variant × Default·Selected 매트릭스(Hover는 마우스를 올려 확인)
export const Matrix: Story = {
  render: (args) => (
    <div className="gap-s6 flex flex-col">
      {variants.map((variant) =>
        [false, true].map((selected) => (
          <div key={`${variant}-${String(selected)}`} className="gap-s6 flex items-center">
            {sizes.map((size) => (
              <ChipButton
                key={size}
                {...args}
                size={size}
                variant={variant}
                selected={selected}
                leftIcon={variant !== 'avatar'}
                rightIcon
              >
                서울특별시
              </ChipButton>
            ))}
          </div>
        )),
      )}
    </div>
  ),
};

const options = ['서울특별시', '경기도', '부산광역시'];

const SingleSelectChips = () => {
  const [value, setValue] = useState(options[0]);
  return (
    <div role="group" aria-label="지역" className="gap-s4 flex">
      {options.map((option) => (
        <ChipButton
          key={option}
          variant="outline"
          selected={value === option}
          onClick={() => setValue(option)}
        >
          {option}
        </ChipButton>
      ))}
    </div>
  );
};

// 하나만 고르는 필터 칩: 눌러서 선택을 바꿈
export const Interactive: Story = { render: () => <SingleSelectChips /> };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextButtonUnderline, type TextButtonUnderlineButtonProps } from './TextButtonUnderline';

const meta = {
  title: 'Web/Button/TextButtonUnderline',
  component: TextButtonUnderline,
  args: { children: '전문보기' },
} satisfies Meta<TextButtonUnderlineButtonProps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 비활성(Figma Disabled): 글자 `text-disabled`, 전체 40% */
export const Disabled: Story = { args: { disabled: true } };

/** 화면 이동은 링크로 그림(`renderLink`) */
export const AsLink: Story = {
  render: (args) => (
    <TextButtonUnderline
      renderLink={({ className, children }) => (
        <a href="#terms" className={className}>
          {children}
        </a>
      )}
    >
      {args.children}
    </TextButtonUnderline>
  ),
};

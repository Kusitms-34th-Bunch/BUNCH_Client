import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../components/button';
import * as icons from './generated';

const sizes = ['Small', 'Medium', 'Large'] as const;
const names = Object.keys(icons)
  .filter((name) => name.endsWith('SmallIcon'))
  .map((name) => name.replace(/SmallIcon$/, ''));

const meta = {
  title: 'Foundations/Icons',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gallery: Story = {
  render: () => (
    <div className="gap-s12 bg-surface-primary text-text-primary flex flex-col">
      <table className="typography-label-s w-full border-collapse">
        <caption className="pb-s8 typography-title-1-semi-bold text-left">Line 23 · Fill 8</caption>
        <thead>
          <tr>
            <th scope="col" className="p-s4 text-left">
              이름
            </th>
            {sizes.map((size) => (
              <th key={size} scope="col" className="p-s4">
                {size}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {names.map((name) => (
            <tr key={name} className="border-border-secondary border-b">
              <th scope="row" className="p-s4 text-text-secondary text-left font-normal">
                {name}
              </th>
              {sizes.map((size) => {
                const Icon = icons[`${name}${size}Icon` as keyof typeof icons];
                return (
                  <td key={size} className="p-s4 text-icon-primary">
                    <span className="flex items-center justify-center">
                      <Icon />
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="gap-s8 typography-label-m flex flex-wrap items-center">
        <span className="text-icon-brand">
          <icons.FillCircleCheckLargeIcon aria-label="완료" />
        </span>
        <Button size="md" leftIcon={<icons.LineCameraMediumIcon />}>
          사진 추가
        </Button>
        <Button size="md" disabled leftIcon={<icons.LineCameraMediumIcon />}>
          사진 추가
        </Button>
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { IconSize } from './types';
import { Button } from '../components/core/button';
import * as icons from './generated';

const sizes: IconSize[] = ['sm', 'md', 'lg'];
const entries = Object.entries(icons).filter(
  ([name]) => !/(Small|Medium|Large)Icon$/.test(name) && !name.startsWith('Graphic'),
);
const graphicEntries = Object.entries(icons).filter(([name]) => name.startsWith('Graphic'));

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
          {entries.map(([name, Icon]) => (
            <tr key={name} className="border-border-secondary border-b">
              <th scope="row" className="p-s4 text-text-secondary text-left font-normal">
                {name}
              </th>
              {sizes.map((size) => (
                <td key={size} className="p-s4 text-icon-primary">
                  <span className="flex items-center justify-center">
                    <Icon size={size} />
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <section className="gap-s4 flex flex-col">
        <h2 className="pb-s4 typography-title-1-semi-bold">Graphic 5 (컬러, 크기 하나)</h2>
        <ul className="gap-s6 flex flex-wrap items-end">
          {graphicEntries.map(([name, Icon]) => (
            <li key={name} className="gap-s2 typography-label-s flex flex-col items-center">
              <Icon />
              <span className="text-text-secondary">{name}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="gap-s8 typography-label-m flex flex-wrap items-center">
        <span className="text-icon-brand">
          <icons.FillCircleCheckIcon size="lg" aria-label="완료" />
        </span>
        <Button size="md" leftIcon={<icons.LineCameraIcon size="md" />}>
          사진 추가
        </Button>
        <Button size="md" disabled leftIcon={<icons.LineCameraIcon size="md" />}>
          사진 추가
        </Button>
      </div>
    </div>
  ),
};

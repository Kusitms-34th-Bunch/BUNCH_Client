import { disableTypeChecked, react } from '@app/lint-config';

export default [
  { ignores: ['storybook-static/**'] },
  ...react,
  { files: ['scripts/*.mjs'], ...disableTypeChecked },
];

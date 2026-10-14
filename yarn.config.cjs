// @ts-check
/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require(`@yarnpkg/types`);

const catalogDependencies = new Set([
  `@babel/core`,
  `@commitlint/cli`,
  `@commitlint/config-conventional`,
  `@rolldown/plugin-babel`,
  `@storybook/react-vite`,
  `@tanstack/react-query`,
  `@testing-library/dom`,
  `@testing-library/jest-dom`,
  `@testing-library/react`,
  `@testing-library/user-event`,
  `@types/node`,
  `@types/react`,
  `@types/react-dom`,
  `@vitejs/plugin-react`,
  `eslint`,
  `babel-plugin-react-compiler`,
  `happy-dom`,
  `ky`,
  `react`,
  `react-dom`,
  `rolldown`,
  `storybook`,
  `typescript`,
  `vite`,
  `vitest`,
]);

module.exports = defineConfig({
  async constraints({ Yarn }) {
    for (const dependency of Yarn.dependencies()) {
      if (dependency.type === `peerDependencies`) continue;
      if (!catalogDependencies.has(dependency.ident)) continue;

      dependency.update(`catalog:`);
    }

    for (const workspace of Yarn.workspaces()) {
      workspace.set(`engines.node`, `>=24`);
    }
  },
});

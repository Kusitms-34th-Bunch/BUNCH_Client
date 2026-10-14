import type { PlopTypes } from '@turbo/gen';
import { execFileSync } from 'node:child_process';

const componentNamePattern = /^[A-Z][A-Za-z0-9]*$/;

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setActionType('syncDesignSystemBarrels', () => {
    execFileSync('yarn', ['workspace', '@app/design-system', 'gen:index'], {
      stdio: 'inherit',
    });

    return 'Synchronized design-system barrel exports';
  });

  plop.setGenerator('ds-component', {
    description: 'Create a design-system React component with test and Storybook story',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (PascalCase)',
        validate: (value: string) =>
          componentNamePattern.test(value) || 'Use PascalCase, for example Button or UserAvatar.',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/design-system/src/components/{{camelCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'templates/ds-component/Component.tsx.hbs',
      },
      {
        type: 'add',
        path: 'packages/design-system/src/components/{{camelCase name}}/{{pascalCase name}}.test.tsx',
        templateFile: 'templates/ds-component/Component.test.tsx.hbs',
      },
      {
        type: 'add',
        path: 'packages/design-system/src/components/{{camelCase name}}/{{pascalCase name}}.stories.tsx',
        templateFile: 'templates/ds-component/Component.stories.tsx.hbs',
      },
      {
        type: 'add',
        path: 'packages/design-system/src/components/{{camelCase name}}/index.ts',
        templateFile: 'templates/ds-component/index.ts.hbs',
      },
      {
        type: 'syncDesignSystemBarrels',
      },
    ],
  });
}

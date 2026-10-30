export default {
  // Tailwind 표준 클래스 자동 수정(packages/design-system/scripts/check-tailwind-classes.mjs)
  '*.{ts,tsx}': ['eslint --fix', 'yarn workspace @app/design-system check:tailwind --fix'],
  '*': 'prettier --write --ignore-unknown',
};

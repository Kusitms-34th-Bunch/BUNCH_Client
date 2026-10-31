export default {
  // 같은 파일을 고치는 명령의 동시 실행 방지: TS는 한 그룹에서 순서대로, 나머지는 겹치지 않는 glob으로 분리
  // Tailwind 표준 클래스 자동 수정(packages/design-system/scripts/check-tailwind-classes.mjs)
  '*.{ts,tsx}': [
    'eslint --fix',
    'yarn workspace @app/design-system check:tailwind --fix',
    'prettier --write',
  ],
  '!(*.ts|*.tsx)': 'prettier --write --ignore-unknown',
};

import { RuleTester } from 'eslint';
import { commentNounEnding } from './comment-noun-ending.js';

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run('comment-noun-ending', commentNounEnding, {
  valid: [
    '// 가상 키보드 가림 방지',
    '/** 접근성 이름. 기본값 `닫기` */',
    '/**\n * 사진 올리기 시트\n * 닫기는 호출자 담당\n */',
    'const a = 1; // 끝 여백 처리',
    '// The value is read here',
    { code: '// 위치를 바꾼다', filename: 'src/icons/generated/Icon.tsx' },
    '// @generated — run `yarn gen:index` to update\n// 자동으로 만든다',
  ].map((test) => (typeof test === 'string' ? { code: test } : test)),
  invalid: [
    { code: '// 위로 끌면 움직이지 않는다', errors: [{ messageId: 'sentence', line: 1 }] },
    { code: '/** 그대로 닫는다 */', errors: [{ messageId: 'sentence', line: 1 }] },
    { code: '// 값을 보정한다(Viewport).', errors: [{ messageId: 'sentence', line: 1 }] },
    { code: 'const a = 1; // 높이를 맞춘다', errors: [{ messageId: 'sentence', line: 1 }] },
    {
      code: '/**\n * 첫 줄 설명\n * 둘째 줄은 문장이다\n */',
      errors: [{ messageId: 'sentence', line: 3 }],
    },
    {
      code: 'const el = <div>{/* 손잡이를 그린다 */}</div>;',
      errors: [{ messageId: 'sentence', line: 1 }],
    },
  ],
});

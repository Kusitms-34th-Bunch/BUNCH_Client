const aiAttribution =
  /co-authored-by:[^\n]*(?:claude|anthropic|copilot|codex|openai|chatgpt)|generated (?:with|by)[^\n]*(?:claude|codex|copilot|chatgpt)/i;

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'no-ai-attribution': ({ raw }) => [
          !aiAttribution.test(raw ?? ''),
          '커밋 메시지에 Co-Authored-By, Generated with 같은 AI 출처 문구를 넣지 않는다',
        ],
      },
    },
  ],
  rules: { 'no-ai-attribution': [2, 'always'] },
};

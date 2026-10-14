import { readFileSync } from 'node:fs';

let payload;

try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const prompt = payload.prompt ?? '';
const lowerPrompt = prompt.toLowerCase();
const suggestions = [];

const rules = [
  [/이슈.*(만들|작성|생성|발급|올려)|(create|open|new) issue/, 'prepare-issue - 이슈 폼 내용 정리'],
  [/commit|커밋/, 'prepare-commit - 커밋 메시지 초안'],
  [/\bpr\b|pull request|풀리퀘스트/, 'prepare-pull-request - PR 제목과 본문 초안'],
  [/refactor|cleanup|dedupe|simplify|리팩터링|정리|중복/, 'refactor-code - 동작 보존 리팩터링'],
  [/review|리뷰/, 'review-changes 또는 review-code-quality - 변경 리뷰'],
  [/performance|성능|느림|느려/, 'diagnose-performance - 측정 기반 성능 진단'],
  [/e2e|playwright/, 'plan-e2e - E2E 범위 설계'],
];

for (const [pattern, suggestion] of rules) {
  if (pattern.test(lowerPrompt)) {
    suggestions.push(suggestion);
  }
}

if (suggestions.length > 0) {
  const additionalContext = `관련 skill:\n${suggestions.map((item) => `- ${item}`).join('\n')}`;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext,
      },
    }),
  );
}

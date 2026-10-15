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
  [
    /figma|피그마|(?:디자인|스크린샷|\b(?:design|screenshot)\b)[\s\S]*(?:구현|만들|\b(?:implement|build|code)\b)|(?:구현|만들|\b(?:implement|build|code)\b)[\s\S]*(?:디자인|스크린샷|\b(?:design|screenshot)\b)/,
    'implement-from-figma - 디자인 구현 요청이면 docs/workflows/development.md의 Figma·스크린샷 구현 흐름과 해당 SKILL.md를 읽고 적용한다. 질문·조사 요청은 구현으로 해석하지 않는다.',
  ],
  [/이슈.*(만들|작성|생성|발급|올려)|(create|open|new) issue/, 'prepare-issue - 이슈 폼 내용 정리'],
  [
    /deliver-work|(?:이슈|커밋).*(?:\bpr\b|풀리퀘스트)|(?:\bpr\b|풀리퀘스트).*(?:올리|올릴|올려)|(?:작업|변경).*(?:올리|올릴|올려|마무리|전달)/,
    'deliver-work - 현재 상태를 보고 이슈·커밋·PR 중 빠진 단계부터 안내, 단계마다 승인',
  ],
  [/commit|커밋/, 'prepare-commit - 커밋 메시지 초안'],
  [
    /review-pr|(?:\bpr\b|풀리퀘스트|pull request)\s*#?\d*.*(?:리뷰|review).*(?:달아|달기|달고|게시|(?:코멘트|comment)s?\s*(?:달|남|게시|올))|\bpr\s*#?\d+.*(?:리뷰|review)|(?:인라인|inline).*(?:리뷰|review|코멘트|comment)/,
    'review-pr - 올라온 PR의 inline 리뷰 초안, 게시는 --publish 명시 또는 확인 뒤',
  ],
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

// review-pr 요청은 PR 초안·일반 리뷰·작업 전달 추천과 겹치므로 단독 추천
const reviewPr = suggestions.find((item) => item.startsWith('review-pr'));

if (reviewPr) {
  suggestions.splice(0, suggestions.length, reviewPr);
}

if (suggestions.length > 0) {
  const additionalContext = `관련 skill:\n${suggestions.map((item) => `- ${item}`).join('\n')}\n선택·후속 실행 기준: docs/agent/bootstrap.md의 "요청에서 실행까지". 추천은 실행 승인이 아니다. 질문·조사·초안 요청의 범위를 유지하고, 구현 요청이면 필요한 후속 스킬·리뷰·검증까지 연결한다.`;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext,
      },
    }),
  );
}

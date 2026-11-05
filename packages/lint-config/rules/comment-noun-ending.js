// docs/conventions/coding.md의 주석 명사형 끝맺음 검사(.claude/hooks/guard-rules.mjs와 같은 판정)
// 한글 뒤 `다`로 끝나는 줄(괄호 덧붙임·마침표 포함) 차단. `바다` 같은 명사 오탐은 감수
const sentenceEnding = /[가-힣]다\s*(\([^)]*\))?\.?\s*$/;

/** @type {import('eslint').Rule.RuleModule} */
export const commentNounEnding = {
  meta: {
    type: 'suggestion',
    docs: { description: '주석을 명사형(~처리, ~방지, ~적용)으로 끝맺기' },
    messages: {
      sentence: '주석은 명사형으로 끝내세요(예: ~처리, ~방지, ~적용, docs/conventions/coding.md).',
    },
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;
    // 생성 표식은 실제 주석만 인정(문자열 안의 `// @generated` 예시로 검사가 꺼지는 것 방지)
    const isGenerated = sourceCode
      .getAllComments()
      .some((comment) => comment.type === 'Line' && /^\s*@generated/.test(comment.value));
    if (/(^|\/)generated\//.test(context.filename) || isGenerated) return {};

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          comment.value.split('\n').forEach((line, index) => {
            // 블록 주석 줄 앞 `*`와 닫는 `*` 제외
            const text = line.replace(/^\s*\*+/, '').replace(/\*+\s*$/, '');
            if (!sentenceEnding.test(text)) return;
            const lineNumber = comment.loc.start.line + index;
            context.report({
              loc: {
                start: { line: lineNumber, column: 0 },
                end: { line: lineNumber, column: sourceCode.lines[lineNumber - 1]?.length ?? 0 },
              },
              messageId: 'sentence',
            });
          });
        }
      },
    };
  },
};

export const bunchPlugin = { rules: { 'comment-noun-ending': commentNounEnding } };

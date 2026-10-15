import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('./skill-suggest.mjs', import.meta.url));

function suggest(input) {
  const result = spawnSync(process.execPath, [hook], { input, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.additionalContext : '';
}

test('Figma 링크·한국어·영문 디자인 구현 요청에 저장소 구현 스킬을 안내한다', () => {
  for (const prompt of [
    '이 1개의 디자인을 Figma에서 구현하세요. @https://www.figma.com/design/example?node-id=115-761&m=dev',
    'https://www.figma.com/file/example?node-id=1-2',
    '피그마 화면 구현해줘',
    'Implement this Figma design',
    'Implement this screenshot',
    'Build this design',
    'Turn this design into code',
    '첨부한 디자인을 구현해줘',
    '이 스크린샷처럼 화면을 만들어줘',
  ]) {
    const output = suggest(JSON.stringify({ prompt }));
    assert.match(output, /implement-from-figma/, prompt);
    assert.match(output, /docs\/workflows\/development\.md/, prompt);
  }
});

test('기존 커밋·PR 추천과 디자인 구현 추천을 함께 유지한다', () => {
  const output = suggest(JSON.stringify({ prompt: 'Figma 구현 후 커밋과 PR 준비' }));
  for (const skill of ['implement-from-figma', 'prepare-commit', 'prepare-pull-request']) {
    assert.ok(output.includes(skill), skill);
  }
});

test('관련 없는 요청에는 디자인 구현을 추천하지 않는다', () => {
  assert.equal(suggest(JSON.stringify({ prompt: '오늘 작업 상태 알려줘' })), '');
  assert.doesNotMatch(
    suggest(JSON.stringify({ prompt: '커밋 메시지 작성' })),
    /implement-from-figma/,
  );
});

test('키워드가 있는 질문에도 추천과 실행 승인을 구분하도록 안내한다', () => {
  for (const prompt of [
    'PR 자동화가 어떻게 동작해?',
    '커밋이 뭐야?',
    '성능 개선 방법만 설명해줘',
  ]) {
    const output = suggest(JSON.stringify({ prompt }));
    assert.match(output, /docs\/agent\/bootstrap\.md/, prompt);
    assert.match(output, /추천은 실행 승인이 아니다/, prompt);
    assert.match(output, /질문·조사·초안 요청의 범위를 유지/, prompt);
  }
});

test('빈 입력과 잘못된 JSON은 조용히 건너뛴다', () => {
  assert.equal(suggest('{}'), '');
  assert.equal(suggest('invalid json'), '');
});

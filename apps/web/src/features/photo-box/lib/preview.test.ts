import { describe, expect, it } from 'vitest';
import { parsePreview } from './preview';

describe('parsePreview', () => {
  it.each(['loading', 'error', 'no-bunch', 'empty'])('허용 값 %s는 그대로 통과한다', (value) => {
    expect(parsePreview(value, true)).toBe(value);
  });

  it('알 수 없는 값·빈 값·배열은 미리보기 없음이다', () => {
    expect(parsePreview('success', true)).toBeUndefined();
    expect(parsePreview('', true)).toBeUndefined();
    expect(parsePreview(undefined, true)).toBeUndefined();
    expect(parsePreview(['loading', 'error'], true)).toBeUndefined();
  });

  it('운영처럼 enabled가 false면 허용 값도 무시한다', () => {
    expect(parsePreview('loading', false)).toBeUndefined();
  });

  it('enabled를 생략하면 테스트 환경(NODE_ENV=test)에서는 열려 있다', () => {
    expect(parsePreview('empty')).toBe('empty');
  });
});

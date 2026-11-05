import { describe, expect, it } from 'vitest';
import { toDomainId, toWireId } from './ids';

describe('toDomainId', () => {
  it('서버 숫자 ID를 문자열 id로 바꾼다', () => {
    expect(toDomainId(42)).toBe('42');
  });
});

describe('toWireId', () => {
  it('양의 정수 문자열을 숫자 ID로 바꾼다', () => {
    expect(toWireId('1')).toBe(1);
    expect(toWireId('5021')).toBe(5021);
  });

  it('0, 음수, 소수, 앞자리 0, 숫자가 아닌 값은 거절한다', () => {
    for (const value of ['0', '-1', '1.5', '007', '1e3', 'abc', '', ' 1', '1 ']) {
      expect(toWireId(value)).toBeUndefined();
    }
  });

  it('안전한 정수 범위를 넘는 값은 거절한다', () => {
    expect(toWireId('9007199254740991')).toBe(9007199254740991);
    expect(toWireId('9007199254740992')).toBeUndefined();
    expect(toWireId('99999999999999999999')).toBeUndefined();
  });

  it('값이 없거나 같은 이름이 여러 번 들어온 배열은 거절한다', () => {
    expect(toWireId(undefined)).toBeUndefined();
    expect(toWireId(['1', '2'])).toBeUndefined();
  });
});

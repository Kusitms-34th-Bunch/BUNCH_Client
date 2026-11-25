import { describe, expect, it } from 'vitest';
import { isUpdateRequired } from './appVersionPolicy';

const minimum = { version: '1.2.0', build: '3' };

describe('isUpdateRequired', () => {
  it('최소 버전보다 낮으면 업데이트, 같거나 높으면 통과한다', () => {
    expect(isUpdateRequired({ version: '1.1.9', build: '99' }, minimum)).toBe(true);
    expect(isUpdateRequired({ version: '1.2.1', build: '1' }, minimum)).toBe(false);
    expect(isUpdateRequired({ version: '2.0', build: '1' }, minimum)).toBe(false);
  });

  it('같은 버전이면 빌드 번호를 숫자로 비교한다', () => {
    expect(isUpdateRequired({ version: '1.2.0', build: '2' }, minimum)).toBe(true);
    expect(isUpdateRequired({ version: '1.2', build: '3' }, minimum)).toBe(false);
    expect(isUpdateRequired({ version: '1.2.0', build: '10' }, minimum)).toBe(false);
  });

  it('이전 쉘은 마지막 이전 쉘(1.1.1 빌드 1)로 보고 비교한다', () => {
    expect(isUpdateRequired('legacy', { version: '1.1.1', build: '1' })).toBe(false);
    expect(isUpdateRequired('legacy', { version: '1.1.1', build: '2' })).toBe(true);
    expect(isUpdateRequired('legacy', minimum)).toBe(true);
  });

  it('지금 정책은 출시된 앱(1.1.1)을 막지 않는다', () => {
    expect(isUpdateRequired({ version: '1.1.1', build: '1' })).toBe(false);
    expect(isUpdateRequired('legacy')).toBe(false);
  });
});

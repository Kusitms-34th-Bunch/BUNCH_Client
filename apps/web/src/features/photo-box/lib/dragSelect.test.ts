import { describe, expect, it } from 'vitest';
import { desiredStates, nextToggle } from './dragSelect';

const ids = ['a', 'b', 'c', 'd', 'e'];
const indexById = new Map(ids.map((id, index) => [id, index]));

describe('desiredStates', () => {
  it('시작 사진부터 지금 사진까지 범위를 target으로 둔다', () => {
    const desired = new Map<string, boolean>();
    desiredStates(desired, ids, new Set(), true, 1, 3);
    expect([...desired]).toEqual([
      ['b', true],
      ['c', true],
      ['d', true],
    ]);
  });

  it('되돌아오면 벗어난 사진은 쓸기 시작 때의 상태로 돌아간다', () => {
    const desired = new Map<string, boolean>();
    const initial = new Set(['d']);
    desiredStates(desired, ids, initial, false, 1, 3);
    desiredStates(desired, ids, initial, false, 1, 1);
    expect(desired.get('b')).toBe(false);
    expect(desired.get('c')).toBe(false); // 원래 선택 전이었음
    expect(desired.get('d')).toBe(true); // 원래 선택돼 있었음
  });

  it('시작 사진을 지나 반대편으로 가면 범위가 뒤집힌다', () => {
    const desired = new Map<string, boolean>();
    desiredStates(desired, ids, new Set(), true, 2, 4);
    desiredStates(desired, ids, new Set(), true, 2, 0);
    expect(desired.get('d')).toBe(false);
    expect(desired.get('e')).toBe(false);
    expect(desired.get('a')).toBe(true);
    expect(desired.get('b')).toBe(true);
  });
});

describe('nextToggle', () => {
  it('이미 원하는 상태면 토글할 것이 없다', () => {
    expect(nextToggle(new Map([['a', true]]), ['a'], indexById, 0)).toBeUndefined();
  });

  it('선택은 시작 사진에 가까운 것부터 한다', () => {
    const desired = new Map([
      ['d', true],
      ['b', true],
      ['c', true],
    ]);
    expect(nextToggle(desired, [], indexById, 1)).toBe('b');
  });

  it('해제를 선택보다 먼저, 시작 사진에서 먼 것부터 한다', () => {
    const desired = new Map([
      ['a', true],
      ['c', false],
      ['d', false],
    ]);
    expect(nextToggle(desired, ['c', 'd'], indexById, 1)).toBe('d');
  });
});

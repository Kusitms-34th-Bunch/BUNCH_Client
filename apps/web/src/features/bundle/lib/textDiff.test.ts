import { describe, expect, it } from 'vitest';
import { diffHunks, mapPosition, type TextHunk } from './textDiff';

// 구간을 적용해 이전 문자열이 새 문자열이 되는지로 diff의 정확성을 확인
const apply = (before: string, hunks: readonly TextHunk[]) => {
  let result = '';
  let cursor = 0;
  for (const { index, remove, insert } of hunks) {
    result += before.slice(cursor, index) + insert;
    cursor = index + remove;
  }
  return result + before.slice(cursor);
};

describe('diffHunks', () => {
  it('같은 문자열이면 바뀐 구간이 없다', () => {
    expect(diffHunks('부산 여행', '부산 여행')).toEqual([]);
  });

  it('한 곳만 바뀌면 구간 하나로 나타낸다', () => {
    expect(diffHunks('제주 여행', '부산 여행')).toEqual([{ index: 0, remove: 2, insert: '부산' }]);
    expect(diffHunks('부산 여행', '부산 여행 1일차')).toEqual([
      { index: 5, remove: 0, insert: ' 1일차' },
    ]);
    // 공통 앞부분 「부산 」 다음의 「1일차 」가 지워짐
    expect(diffHunks('부산 1일차 여행', '부산 여행')).toEqual([
      { index: 3, remove: 4, insert: '' },
    ]);
  });

  it('앞뒤에 동시에 끼어든 변경은 구간 둘로 나눈다', () => {
    expect(diffHunks('abcd', 'XabcdY')).toEqual([
      { index: 0, remove: 0, insert: 'X' },
      { index: 4, remove: 0, insert: 'Y' },
    ]);
  });

  it('여러 곳이 섞여 바뀌어도 구간을 적용하면 새 문자열이 된다', () => {
    const cases: [string, string][] = [
      ['부산 여행', '가을 부산 여행 1일차'],
      ['abcdef', 'aXcdYf'],
      ['제목', ''],
      ['', '새 제목'],
      ['aaa', 'aaaa'],
      ['한글 입력', '한글 입력 한글'],
    ];
    for (const [before, after] of cases) {
      expect(apply(before, diffHunks(before, after))).toBe(after);
    }
  });

  it('이모지(서로게이트 쌍)는 가르지 않는다', () => {
    const hunks = diffHunks('a😀b', 'a😎b');
    expect(hunks).toEqual([{ index: 1, remove: 2, insert: '😎' }]);
    expect(apply('a😀b', hunks)).toBe('a😎b');
  });

  it('아주 긴 변경은 한 구간으로 대신한다', () => {
    const before = '가'.repeat(600);
    const after = '나'.repeat(600);

    expect(diffHunks(before, after)).toEqual([{ index: 0, remove: 600, insert: after }]);
  });
});

describe('mapPosition', () => {
  it('앞뒤에 동시에 삽입돼도 커서는 같은 글자 뒤에 남는다', () => {
    const hunks = diffHunks('abcd', 'XabcdY');

    // b 뒤(2)는 X 한 글자만큼만 밀린 3(문자열 끝인 6이 아님)
    expect(mapPosition(2, hunks)).toBe(3);
    expect(mapPosition(0, hunks)).toBe(0);
    expect(mapPosition(4, hunks)).toBe(5);
  });

  it('선택 영역의 시작과 끝을 각각 보정한다', () => {
    const hunks = diffHunks('abcd', 'XabcdY');

    // b~c 선택(1~3)이 같은 글자를 계속 가리키는 위치 보정
    expect([mapPosition(1, hunks), mapPosition(3, hunks)]).toEqual([2, 4]);
  });

  it('구간 하나일 때는 기존 단일 구간 계산과 같다', () => {
    const hunks = diffHunks('abXYef', 'abZef');

    expect(mapPosition(1, hunks)).toBe(1);
    // 지워진 구간 안은 바꾼 글자의 끝
    expect(mapPosition(3, hunks)).toBe(3);
    expect(mapPosition(4, hunks)).toBe(3);
    expect(mapPosition(5, hunks)).toBe(4);
  });

  it('삽입 지점에 있던 커서는 삽입된 글자 앞에 남는다', () => {
    expect(mapPosition(2, diffHunks('ab', 'abXY'))).toBe(2);
    expect(mapPosition(0, diffHunks('ab', 'XYab'))).toBe(0);
  });

  it('구간 앞의 커서는 그대로, 여러 구간 뒤의 커서는 누적해서 민다', () => {
    const hunks = diffHunks('abcdef', 'XabYcdef');

    expect(mapPosition(1, hunks)).toBe(2);
    expect(mapPosition(6, hunks)).toBe(8);
  });
});

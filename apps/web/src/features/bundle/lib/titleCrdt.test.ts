import { beforeAll, describe, expect, it } from 'vitest';
import { countTitleGraphemes, displayTitle } from './title';
import {
  createTitleDoc,
  diffText,
  editTitle,
  ensureTitleCrdt,
  loadTitleDoc,
  mergeTitleDocs,
  saveTitleDoc,
  titleText,
} from './titleCrdt';

beforeAll(async () => {
  await ensureTitleCrdt();
});

// 서버가 준 문서처럼 저장했다가 불러온 문서(같은 TEXT를 공유)
const fromServer = (text: string) => saveTitleDoc(createTitleDoc(text));

describe('diffText', () => {
  it.each([
    ['부산', '부산 여행', { index: 2, remove: 0, insert: ' 여행' }],
    ['부산 여행', '부산', { index: 2, remove: 3, insert: '' }],
    ['부산 여행', '부산 맛집', { index: 3, remove: 2, insert: '맛집' }],
    ['abc', 'abc', { index: 3, remove: 0, insert: '' }],
    ['', '가', { index: 0, remove: 0, insert: '가' }],
  ])('%s → %s', (before, after, expected) => {
    expect(diffText(before, after)).toEqual(expected);
  });

  it('이모지 같은 서로게이트 쌍을 가르지 않는다', () => {
    const result = diffText('a😀b', 'a😁b');
    expect(result).toEqual({ index: 1, remove: 2, insert: '😁' });
  });
});

describe('제목 문서', () => {
  it('서버 문서를 불러와 바뀐 부분만 고치고 다시 저장한다', () => {
    const doc = loadTitleDoc(fromServer('부산 여행'));
    const edited = editTitle(doc, '부산 맛집 여행');

    expect(titleText(edited)).toBe('부산 맛집 여행');
    expect(titleText(loadTitleDoc(saveTitleDoc(edited)))).toBe('부산 맛집 여행');
  });

  it('같은 내용이면 문서를 바꾸지 않는다', () => {
    const doc = loadTitleDoc(fromServer('부산'));
    expect(editTitle(doc, '부산')).toBe(doc);
  });

  it('같은 문서에서 갈라진 동시 편집이 둘 다 남도록 병합되고 순서와 중복에 상관없다', () => {
    const base = fromServer('부산 여행');
    const mine = editTitle(loadTitleDoc(base), '가을 부산 여행');
    const theirs = editTitle(loadTitleDoc(base), '부산 여행기');

    const a = mergeTitleDocs(mine, theirs);
    const b = mergeTitleDocs(theirs, mine);
    const again = mergeTitleDocs(a, theirs);

    expect(titleText(a)).toBe(titleText(b));
    expect(titleText(a)).toContain('가을');
    expect(titleText(a)).toContain('여행기');
    expect(titleText(again)).toBe(titleText(a));
  });
});

describe('표시 제목과 글자 수', () => {
  it('NFC로 바꾸고 앞뒤 공백을 지운다', () => {
    expect(displayTitle('  \u1112\u1161\u11ab  ')).toBe('\ud55c');
  });

  it('보이는 글자(grapheme) 수로 센다', () => {
    expect(countTitleGraphemes('가'.repeat(40))).toBe(40);
    expect(countTitleGraphemes(`${'가'.repeat(39)}👨‍👩‍👧`)).toBe(40);
    expect(countTitleGraphemes(`${'가'.repeat(40)}나`)).toBe(41);
  });
});

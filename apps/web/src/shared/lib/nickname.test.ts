import { describe, expect, it } from 'vitest';
import {
  hasInvalidNicknameChars,
  isValidNickname,
  NICKNAME_MAX_LENGTH,
  normalizeNickname,
  pasteIntoNickname,
} from './nickname';

describe('nickname', () => {
  describe('normalizeNickname', () => {
    it('앞뒤 공백은 지우고 가운데 공백은 그대로 둔다', () => {
      expect(normalizeNickname('  지원 이  ')).toBe('지원 이');
    });

    it('NFC로 정규화한다', () => {
      const decomposed = '가'; // 가를 자모로 분해한 형태
      expect(normalizeNickname(decomposed)).toBe('가');
    });
  });

  describe('hasInvalidNicknameChars', () => {
    it.each(['지원', 'abcABC', '123', '지원 abc 12', ''])('%s는 허용한다', (value) => {
      expect(hasInvalidNicknameChars(value, false)).toBe(false);
    });

    it.each(['지원!', '지@원', 'a_b', '지원😀', '지원\n', '지원.'])(
      '%s는 허용하지 않는다',
      (value) => {
        expect(hasInvalidNicknameChars(value, false)).toBe(true);
      },
    );

    it('자모가 분해된(NFD) 한글도 완성형으로 합쳐 허용한다', () => {
      expect(hasInvalidNicknameChars('\u1100\u1161', false)).toBe(false);
    });

    it('한글 조합 중에는 자모를 허용하고 조합이 끝나면 허용하지 않는다', () => {
      expect(hasInvalidNicknameChars('지ㅇ', true)).toBe(false);
      expect(hasInvalidNicknameChars('지ㅇ', false)).toBe(true);
    });
  });

  describe('isValidNickname', () => {
    it('1자부터 최대 길이까지 유효하다', () => {
      expect(isValidNickname('가')).toBe(true);
      expect(isValidNickname('가'.repeat(NICKNAME_MAX_LENGTH))).toBe(true);
    });

    it('최대 길이를 넘으면 유효하지 않다', () => {
      expect(isValidNickname('가'.repeat(NICKNAME_MAX_LENGTH + 1))).toBe(false);
    });

    it('비어 있거나 공백만 있으면 유효하지 않다', () => {
      expect(isValidNickname('')).toBe(false);
      expect(isValidNickname('   ')).toBe(false);
    });

    it('앞뒤 공백을 지운 길이로 센다', () => {
      expect(isValidNickname(` ${'가'.repeat(NICKNAME_MAX_LENGTH)} `)).toBe(true);
    });

    it('허용되지 않는 문자가 있으면 유효하지 않다', () => {
      expect(isValidNickname('지원!')).toBe(false);
    });

    it('조합 중인 자모는 조합 중일 때만 유효로 본다', () => {
      expect(isValidNickname('ㅇ', true)).toBe(true);
      expect(isValidNickname('ㅇ', false)).toBe(false);
    });
  });

  describe('pasteIntoNickname', () => {
    it('특수문자·이모지·줄바꿈은 빼고 선택 영역에 넣는다', () => {
      expect(pasteIntoNickname('으누', { start: 2, end: 2 }, 'a!b@\n😀c')).toEqual({
        value: '으누abc',
        caret: 5,
      });
    });

    it('커서가 가운데면 그 자리에 넣고 선택한 글자는 바꾼다', () => {
      expect(pasteIntoNickname('가나다', { start: 1, end: 2 }, 'x!')).toEqual({
        value: '가x다',
        caret: 2,
      });
    });

    it('최대 길이를 넘는 뒤쪽은 자른다', () => {
      const result = pasteIntoNickname('가'.repeat(10), { start: 10, end: 10 }, 'abcde!');

      expect(result?.value).toBe(`${'가'.repeat(10)}ab`);
      expect(result?.caret).toBe(NICKNAME_MAX_LENGTH);
    });

    it('넣을 글자가 하나도 남지 않으면 입력을 바꾸지 않는다', () => {
      expect(pasteIntoNickname('으누', { start: 0, end: 2 }, '!@#\n')).toBeNull();
    });

    it('분해된 자모(NFD)는 완성형으로 합쳐 넣는다', () => {
      expect(pasteIntoNickname('', { start: 0, end: 0 }, '한'.normalize('NFD'))?.value).toBe('한');
    });
  });
});

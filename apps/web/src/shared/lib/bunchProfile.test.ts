import { describe, expect, it } from 'vitest';
import {
  BUNCH_NAME_AVAILABLE_MESSAGE,
  BUNCH_NAME_CHECKING_MESSAGE,
  BUNCH_NAME_INVALID_MESSAGE,
  BUNCH_NAME_PROHIBITED_MESSAGE,
  BUNCH_NAME_TAKEN_MESSAGE,
  bunchNameMessages,
  hasInvalidBunchNameChars,
  pasteBunchName,
} from './bunchProfile';

describe('hasInvalidBunchNameChars', () => {
  it('영문·숫자·완성형 한글·공백만 허용한다', () => {
    expect(hasInvalidBunchNameChars('퇴근런Club24', false)).toBe(false);
    expect(hasInvalidBunchNameChars('퇴근 런', false)).toBe(false);
    expect(hasInvalidBunchNameChars('러닝!', false)).toBe(true);
    expect(hasInvalidBunchNameChars('러닝\n크루', false)).toBe(true);
    expect(hasInvalidBunchNameChars('러닝\t크루', false)).toBe(true);
  });

  it('조합 중에는 자모를 허용하고, 조합이 끝나면 막는다', () => {
    expect(hasInvalidBunchNameChars('퇴근ㄹ', true)).toBe(false);
    expect(hasInvalidBunchNameChars('퇴근ㄹ', false)).toBe(true);
  });
});

describe('pasteBunchName', () => {
  it('허용 문자만이면 브라우저 기본 붙여넣기에 맡긴다', () => {
    expect(pasteBunchName('', { start: 0, end: 0 }, '맛집 탐방 1')).toBe('native');
  });

  it('쓸 수 없는 문자는 빼고 커서 자리에 넣는다', () => {
    expect(pasteBunchName('우리', { start: 2, end: 2 }, '모임!🎉')).toEqual({
      value: '우리모임',
      caret: 4,
    });
  });

  it('12자를 넘는 뒤쪽은 자르고, 넣을 글자가 없으면 바꾸지 않는다', () => {
    expect(pasteBunchName('가'.repeat(10), { start: 10, end: 10 }, 'abc!')).toEqual({
      value: `${'가'.repeat(10)}ab`,
      caret: 12,
    });
    expect(pasteBunchName('우리', { start: 2, end: 2 }, '!🎉')).toBeNull();
  });

  it('가운데에 붙여넣어도 원래 이름은 지키고 붙여넣은 글의 뒤쪽을 자른다', () => {
    expect(pasteBunchName('가'.repeat(10), { start: 5, end: 5 }, 'abc!')).toEqual({
      value: `${'가'.repeat(5)}ab${'가'.repeat(5)}`,
      caret: 7,
    });
  });
});

describe('bunchNameMessages', () => {
  const none = { invalid: false, prohibited: false, taken: false, availability: 'idle' } as const;

  it('오류는 문자 규칙, 금칙어, 사용 중 순으로 하나만 고른다', () => {
    expect(
      bunchNameMessages({ ...none, invalid: true, prohibited: true, taken: true }).errorMessage,
    ).toBe(BUNCH_NAME_INVALID_MESSAGE);
    expect(bunchNameMessages({ ...none, prohibited: true, taken: true }).errorMessage).toBe(
      BUNCH_NAME_PROHIBITED_MESSAGE,
    );
    expect(bunchNameMessages({ ...none, taken: true }).errorMessage).toBe(BUNCH_NAME_TAKEN_MESSAGE);
    expect(bunchNameMessages(none).errorMessage).toBeUndefined();
  });

  it('확인 중과 사용 가능일 때만 안내 문구를 낸다', () => {
    expect(bunchNameMessages({ ...none, availability: 'checking' }).helperMessage).toBe(
      BUNCH_NAME_CHECKING_MESSAGE,
    );
    expect(bunchNameMessages({ ...none, availability: 'available' }).helperMessage).toBe(
      BUNCH_NAME_AVAILABLE_MESSAGE,
    );
    for (const availability of ['idle', 'taken', 'prohibited', 'failed'] as const) {
      expect(bunchNameMessages({ ...none, availability }).helperMessage).toBeUndefined();
    }
  });
});

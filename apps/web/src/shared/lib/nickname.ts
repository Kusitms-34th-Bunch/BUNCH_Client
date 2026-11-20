import type { PasteResult } from './filteredPaste';

export const NICKNAME_MAX_LENGTH = 12;

export const NICKNAME_INVALID_MESSAGE = '특수문자를 제외한 영문, 한글만 사용할 수 있어요.';
export const NICKNAME_TAKEN_MESSAGE = '이미 사용 중인 닉네임이에요';
/** 붙여넣기로 12자를 넘은 닉네임(기능명세 1.4.3, 직접 입력은 12자에서 멈춤) */
export const NICKNAME_TOO_LONG_MESSAGE = '입력 가능한 글자수를 초과했어요';
/** 금칙어가 들어 있는 닉네임(기능명세 1.4.3 로직 4, 마침표 없음) */
export const NICKNAME_PROHIBITED_MESSAGE = '사용할 수 없는 닉네임이에요';
/** 중복 확인이 진행되는 동안 입력란 아래에 보이는 안내(Figma, 확인이 끝나 문제가 없으면 사라짐) */
export const NICKNAME_CHECKING_MESSAGE = '사용 가능한 닉네임인지 확인 중이에요.';
/** 중복·금칙어 확인을 통과한 닉네임(기능명세 1.4.4·7.2.5, 지금 닉네임과 같으면 확인하지 않아 보이지 않음) */
export const NICKNAME_AVAILABLE_MESSAGE = '사용 가능한 닉네임이에요';

// 한글·영문·숫자와 사이 공백만 허용(특수문자·이모지 불가)
const ALLOWED = /^[A-Za-z0-9가-힣 ]*$/;
// 한글 IME 조합 중 자모 허용으로 오류 깜빡임 방지
const COMPOSING_ALLOWED = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ ]*$/;

/**
 * 붙여넣은 글을 입력 칸에 넣은 결과(선택 영역을 대체)
 * 허용하지 않는 문자(특수문자·이모지·줄바꿈)는 빼고 넣음. 최대 길이를 넘어도 자르지 않고 넣어 초과 안내를 보이게 함
 * 넣을 글자가 하나도 남지 않으면 null(입력을 바꾸지 않음), `caret`은 넣은 뒤 커서 위치
 */
export const pasteIntoNickname = (
  current: string,
  selection: { start: number; end: number },
  pasted: string,
): { value: string; caret: number } | null => {
  const clean = pasted.normalize('NFC').replace(/[^A-Za-z0-9가-힣 ]/g, '');
  if (clean === '') return null;
  const value = current.slice(0, selection.start) + clean + current.slice(selection.end);
  return { value, caret: selection.start + clean.length };
};

/** 붙여넣은 결과가 최대 길이를 넘는지(앞뒤 공백을 지운 길이, 넘으면 브라우저 `maxLength`가 자르지 않게 직접 넣음) */
export const exceedsNicknameLength = (value: string) =>
  normalizeNickname(value).length > NICKNAME_MAX_LENGTH;

/** 닉네임 입력란의 붙여넣기: 허용 문자만이고 12자 안이면 브라우저 기본 동작 */
export const pasteNickname = (
  current: string,
  selection: { start: number; end: number },
  pasted: string,
): PasteResult => {
  const result = pasteIntoNickname(current, selection, pasted);
  // 기본 붙여넣기는 입력 그대로의 길이로 판단(브라우저 `maxLength`가 앞 공백까지 세어 끝 글자를 자르지 않게)
  const fits = (result?.value.length ?? 0) <= NICKNAME_MAX_LENGTH;
  return !hasInvalidNicknameChars(pasted, false) && fits ? 'native' : result;
};

/** 저장·중복 확인에 쓰는 값: NFC 정규화 후 앞뒤 공백 제거 */
export const normalizeNickname = (value: string) => value.normalize('NFC').trim();

/** 허용되지 않는 문자가 있는지. 자모가 분해된 입력(NFD)도 완성형으로 합친 뒤 검사 */
export const hasInvalidNicknameChars = (value: string, composing: boolean) =>
  !(composing ? COMPOSING_ALLOWED : ALLOWED).test(value.normalize('NFC'));

/** 규칙에 맞는 닉네임인지(앞뒤 공백 제거 후 1~12자, 허용 문자만). 공백만 입력하면 빈 값으로 취급 */
export const isValidNickname = (value: string, composing = false) => {
  if (hasInvalidNicknameChars(value, composing)) return false;
  const length = normalizeNickname(value).length;
  return length >= 1 && length <= NICKNAME_MAX_LENGTH;
};

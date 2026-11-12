export const NICKNAME_MAX_LENGTH = 12;

export const NICKNAME_INVALID_MESSAGE = '특수문자를 제외한 영문, 한글만 사용할 수 있어요.';
export const NICKNAME_TAKEN_MESSAGE = '이미 사용 중인 닉네임이에요.';
/** 중복 확인이 진행되는 동안 입력란 아래에 보이는 안내(Figma, 확인이 끝나 문제가 없으면 사라짐) */
export const NICKNAME_CHECKING_MESSAGE = '사용 가능한 닉네임인지 확인 중이에요.';

// 한글·영문·숫자와 사이 공백만 허용(특수문자·이모지 불가)
const ALLOWED = /^[A-Za-z0-9가-힣 ]*$/;
// 한글 IME 조합 중 자모 허용으로 오류 깜빡임 방지
const COMPOSING_ALLOWED = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ ]*$/;

/**
 * 붙여넣은 글을 입력 칸에 넣은 결과(선택 영역을 대체)
 * 허용하지 않는 문자(특수문자·이모지·줄바꿈)는 빼고 넣으며 최대 길이를 넘는 뒤쪽은 자름
 * 넣을 글자가 하나도 남지 않으면 null(입력을 바꾸지 않음), `caret`은 넣은 뒤 커서 위치
 */
export const pasteIntoNickname = (
  current: string,
  selection: { start: number; end: number },
  pasted: string,
): { value: string; caret: number } | null => {
  const clean = pasted.normalize('NFC').replace(/[^A-Za-z0-9가-힣 ]/g, '');
  if (clean === '') return null;
  const value = (current.slice(0, selection.start) + clean + current.slice(selection.end)).slice(
    0,
    NICKNAME_MAX_LENGTH,
  );
  return { value, caret: Math.min(selection.start + clean.length, NICKNAME_MAX_LENGTH) };
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

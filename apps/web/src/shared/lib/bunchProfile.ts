import type { NicknameAvailability } from '@/shared/hooks/useNicknameAvailability';
import { COMMON_MESSAGES } from '@/shared/constants/messages';
import type { PasteResult } from './filteredPaste';

// 번치 이름·소개 입력 규칙(번치 만들기와 프로필 편집이 함께 사용, 기능명세 2.2·5.5)
export const BUNCH_NAME_MAX_LENGTH = 12;
export const BUNCH_DESCRIPTION_MAX_LENGTH = 50;
/** 번치 캐릭터 타입(서버 `characterType`). 번치 만들기에서 고른 성격, 홈 배경색·기본 대표 이미지를 정함 */
export const CHARACTER_TYPES = ['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4'] as const;
export type CharacterType = (typeof CHARACTER_TYPES)[number];

/** 번치 타입별 기본 대표 이미지(색이 타입을 나타냄, Figma 5931:161617·161619·161622·161624) */
export const DEFAULT_BUNCH_IMAGES: Readonly<Record<CharacterType, string>> = {
  TYPE_1: '/images/default-bunch/type-1.svg',
  TYPE_2: '/images/default-bunch/type-2.svg',
  TYPE_3: '/images/default-bunch/type-3.svg',
  TYPE_4: '/images/default-bunch/type-4.svg',
};
/** 번치 대표 사진이 없을 때 보이는 기본 이미지. 번치 타입에 맞추고 타입을 모르면 타입 1 */
export const defaultBunchImage = (type?: CharacterType | null) =>
  DEFAULT_BUNCH_IMAGES[type ?? 'TYPE_1'];
/** 사진이 없는 사용자(멤버·내 프로필)의 기본 이미지. 번치 타입과 관계없이 하나(Figma 5931:166793) */
export const DEFAULT_PROFILE_IMAGE = '/images/default-profile.svg';

export const BUNCH_NAME_INVALID_MESSAGE = COMMON_MESSAGES.nameCharactersInvalid;
/** 다른 번치가 쓰는 이름(번치 만들기·프로필 편집) */
export const BUNCH_NAME_TAKEN_MESSAGE = '이미 사용 중인 번치 이름이에요';
/** 금칙어가 들어 있는 번치 이름·한 줄 소개(기능명세 1.4.3 로직 4, 마침표 없음) */
export const BUNCH_NAME_PROHIBITED_MESSAGE = '사용할 수 없는 번치 이름이에요';
export const BUNCH_DESCRIPTION_PROHIBITED_MESSAGE = '사용할 수 없는 단어가 포함되어 있어요';
/** 이름 중복 확인이 진행되는 동안 입력란 아래에 보이는 안내(Figma, 확인이 끝나 문제가 없으면 사라짐) */
export const BUNCH_NAME_CHECKING_MESSAGE = '사용 가능한 이름인지 확인 중이에요.';
/** 중복·금칙어 확인을 통과한 이름(기능명세 2.2.3·5.5.3, 지금 이름과 같으면 확인하지 않아 보이지 않음) */
export const BUNCH_NAME_AVAILABLE_MESSAGE = '사용 가능한 번치 이름이에요';

// 영문·숫자·완성형 한글·공백(기능명세 2.2.2 상세 3, 앞뒤 공백은 저장·확인 때 지움)
const NAME_PATTERN = /^[A-Za-z0-9가-힣 ]*$/;
// 한글 IME 조합 중 자모 허용으로 오류 깜빡임 방지
const COMPOSING_NAME_PATTERN = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ ]*$/;

/** 이름에 쓸 수 없는 문자가 있는지(조합 중이면 자모 허용) */
export const hasInvalidBunchNameChars = (name: string, composing: boolean) =>
  !(composing ? COMPOSING_NAME_PATTERN : NAME_PATTERN).test(name);

/**
 * 번치 이름 입력란의 붙여넣기: 쓸 수 없는 문자는 빼고 넣고 12자를 넘는 붙여넣은 글의 뒤쪽은 자름(기능명세 2.2.2 예외)
 * 허용 문자만이면 브라우저 기본 동작(`maxLength`가 자름). 서버는 닉네임과 같은 이름 규칙으로 검사
 */
export const pasteBunchName = (
  current: string,
  selection: { start: number; end: number },
  pasted: string,
): PasteResult => {
  if (!hasInvalidBunchNameChars(pasted, false)) return 'native';
  const clean = pasted.normalize('NFC').replace(/[^A-Za-z0-9가-힣 ]/g, '');
  if (clean === '') return null;
  // 남은 칸만큼만 넣어 원래 이름은 지키고 붙여넣은 글의 뒤쪽을 자름(브라우저 `maxLength`와 같음)
  const room = BUNCH_NAME_MAX_LENGTH - (current.length - (selection.end - selection.start));
  const inserted = clean.slice(0, Math.max(0, room));
  if (inserted === '') return null;
  const value = current.slice(0, selection.start) + inserted + current.slice(selection.end);
  return { value, caret: selection.start + inserted.length };
};

/** 번치 이름 입력란의 오류·안내 문구(번치 만들기·프로필 편집 공통). 오류는 문자 규칙, 금칙어, 사용 중 순 */
export const bunchNameMessages = ({
  invalid,
  prohibited,
  taken,
  availability,
}: {
  invalid: boolean;
  prohibited: boolean;
  taken: boolean;
  availability: NicknameAvailability;
}) => ({
  errorMessage: invalid
    ? BUNCH_NAME_INVALID_MESSAGE
    : prohibited
      ? BUNCH_NAME_PROHIBITED_MESSAGE
      : taken
        ? BUNCH_NAME_TAKEN_MESSAGE
        : undefined,
  // 확인 중 안내와 통과 문구(기능명세 2.2.3·5.5.3), 오류가 있으면 입력란이 오류 문구를 대신 보임
  helperMessage:
    availability === 'checking'
      ? BUNCH_NAME_CHECKING_MESSAGE
      : availability === 'available'
        ? BUNCH_NAME_AVAILABLE_MESSAGE
        : undefined,
});

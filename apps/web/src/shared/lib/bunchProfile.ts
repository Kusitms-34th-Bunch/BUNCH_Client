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

export const BUNCH_NAME_INVALID_MESSAGE = '특수문자를 제외한 영문, 한글만 사용할 수 있어요.';

const NAME_PATTERN = /^[A-Za-z0-9가-힣]*$/;
// 한글 IME 조합 중 자모 허용으로 오류 깜빡임 방지
const COMPOSING_NAME_PATTERN = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]*$/;

/** 이름에 쓸 수 없는 문자가 있는지(조합 중이면 자모 허용) */
export const hasInvalidBunchNameChars = (name: string, composing: boolean) =>
  !(composing ? COMPOSING_NAME_PATTERN : NAME_PATTERN).test(name);

// 번치 이름·소개 입력 규칙(번치 만들기와 프로필 편집이 함께 사용, 기능명세 2.2·5.5)
export const BUNCH_NAME_MAX_LENGTH = 12;
export const BUNCH_DESCRIPTION_MAX_LENGTH = 50;
/** 번치·프로필 대표 이미지가 없을 때의 기본 이미지(구름 마스코트, 디자인 시스템에 없는 앱 자산, 기능명세 5.1.2) */
export const DEFAULT_BUNCH_IMAGE = '/images/default-bunch.png';

/** 번치 캐릭터 타입(서버 `characterType`). 번치 만들기에서 고른 성격, 홈 배경색·기본 대표 이미지를 정함 */
export const CHARACTER_TYPES = ['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4'] as const;
export type CharacterType = (typeof CHARACTER_TYPES)[number];

/** 캐릭터 타입별 기본 대표 이미지(Figma 4359:61135·86853·86859·86865) */
export const DEFAULT_BUNCH_IMAGES: Readonly<Record<CharacterType, string>> = {
  TYPE_1: '/images/default-bunch/type-1.svg',
  TYPE_2: '/images/default-bunch/type-2.svg',
  TYPE_3: '/images/default-bunch/type-3.svg',
  TYPE_4: '/images/default-bunch/type-4.svg',
};
export const BUNCH_NAME_INVALID_MESSAGE = '특수문자를 제외한 영문, 한글만 사용할 수 있어요.';

const NAME_PATTERN = /^[A-Za-z0-9가-힣]*$/;
// 한글 IME 조합 중 자모 허용으로 오류 깜빡임 방지
const COMPOSING_NAME_PATTERN = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]*$/;

/** 이름에 쓸 수 없는 문자가 있는지(조합 중이면 자모 허용) */
export const hasInvalidBunchNameChars = (name: string, composing: boolean) =>
  !(composing ? COMPOSING_NAME_PATTERN : NAME_PATTERN).test(name);

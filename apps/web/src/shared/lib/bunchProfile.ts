// 번치 이름·소개 입력 규칙(번치 만들기와 프로필 편집이 함께 사용, 기능명세 2.2·5.5)
export const BUNCH_NAME_MAX_LENGTH = 12;
export const BUNCH_DESCRIPTION_MAX_LENGTH = 50;
/** 번치·프로필 대표 이미지가 없을 때의 기본 이미지(구름 마스코트, 디자인 시스템에 없는 앱 자산, 기능명세 5.1.2) */
export const DEFAULT_BUNCH_IMAGE = '/images/default-bunch.png';
export const BUNCH_NAME_INVALID_MESSAGE = '특수문자를 제외한 영문, 한글만 사용할 수 있어요.';

const NAME_PATTERN = /^[A-Za-z0-9가-힣]*$/;
// 한글 IME 조합 중 자모 허용으로 오류 깜빡임 방지
const COMPOSING_NAME_PATTERN = /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]*$/;

/** 이름에 쓸 수 없는 문자가 있는지(조합 중이면 자모 허용) */
export const hasInvalidBunchNameChars = (name: string, composing: boolean) =>
  !(composing ? COMPOSING_NAME_PATTERN : NAME_PATTERN).test(name);

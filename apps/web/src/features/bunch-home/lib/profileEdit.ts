import type { BunchProfileImageChange } from '../api/bunchHome';
import type { BunchProfileEdit as BunchProfile } from './types';

/** 편집할 번치의 저장된 값과 그 값의 프로필 버전 */
export type EditableProfile = BunchProfile & { profileVersion?: number | undefined };

/** 저장 때 서버가 금칙어로 거부한 값(보낸 그대로). 그 칸을 고치면 안내가 사라짐 */
export type ProhibitedValues = { name?: string | undefined; description?: string | undefined };
/**
 * 저장할 값. 대표 사진은 그대로·새 사진·기본 이미지 중 하나
 * `expectedProfileVersion`은 폼을 연 때의 버전(그 사이 다른 곳에서 바뀌었으면 서버가 거절해 모르고 덮어쓰지 않음)
 */
export type BunchProfileDraft = Omit<BunchProfile, 'imageSrc'> & {
  image: BunchProfileImageChange;
  expectedProfileVersion: number | undefined;
};

/** 저장 거부가 없음(참조가 같아 다시 그려도 거부 처리 effect가 다시 돌지 않음) */
export const NO_PROHIBITED: ProhibitedValues = {};

import type { Gender } from '@/shared/components/profile/GenderField';

type ServerGender = 'FEMALE' | 'MALE';

const TO_SERVER = { female: 'FEMALE', male: 'MALE' } as const satisfies Record<
  Gender,
  ServerGender
>;
const FROM_SERVER = { FEMALE: 'female', MALE: 'male' } as const satisfies Record<
  ServerGender,
  Gender
>;

/** 화면의 성별 값을 서버 값으로 */
export const toServerGender = (gender: Gender): ServerGender => TO_SERVER[gender];

/** 서버의 성별 값을 화면 값으로 */
export const fromServerGender = (gender: ServerGender): Gender => FROM_SERVER[gender];

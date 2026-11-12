import type { components } from '@app/api-core/generated';
import { type ApiContract, normalizeError } from '@app/api-core';
import { z } from 'zod';
import type { Gender } from '@/shared/components/profile/GenderField';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { dataUrlToBlob } from '@/shared/lib/dataUrl';
import { getTermVersions } from './terms';

/** `POST /api/v1/members/me/registration` 응답 */
const registrationSchema = z.object({
  memberId: z.number().int().positive(),
  signupStatus: z.enum(['IN_PROGRESS', 'COMPLETED']),
  nickname: z.string(),
  imageUrl: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['RegistrationResponse']>>;

const SERVER_GENDER = { female: 'FEMALE', male: 'MALE' } as const satisfies Record<Gender, string>;

export type RegistrationInput = {
  /** 앞뒤 공백을 지운 닉네임 */
  nickname: string;
  /** 선택 약관(추가 개인정보)에 동의했는지. 동의해야 출생연도·성별을 보냄 */
  demographicsConsent: boolean;
  birthYear?: number | undefined;
  gender?: Gender | undefined;
  /** 조정을 마친 JPEG data URL(512px). 없으면 기본 이미지 */
  photo?: string | undefined;
};

/**
 * 가입 완료(프로필 저장). 닉네임·선택 정보와 사진을 multipart로 보냄(`profile` JSON + `photo` JPEG)
 * 출생연도·성별은 선택 약관에 동의했을 때만 현재 동의 버전(`demographicsConsentVersion`)과 함께 보냄(서버가 동의 없이 받으면 400)
 * 서버가 동의 버전을 주지 않으면 출생연도·성별은 보내지 않음. 사진 저장만 실패해도 서버는 기본 이미지로 가입을 완료함
 * 같은 프로필의 재시도는 서버가 기존 결과를 돌려줌. 실패는 `ApiError`로 던짐(닉네임 중복은 코드 `USER_002`)
 */
export const registerMember = async ({
  nickname,
  demographicsConsent,
  birthYear,
  gender,
  photo,
}: RegistrationInput) => {
  try {
    const profile: Record<string, unknown> = { nickname };
    if (demographicsConsent) {
      const version = (await getTermVersions()).DEMOGRAPHICS;
      if (version) {
        profile.demographicsConsentVersion = version;
        if (birthYear !== undefined) profile.birthYear = birthYear;
        if (gender) profile.gender = SERVER_GENDER[gender];
      }
    }

    const body = new FormData();
    body.append('profile', new Blob([JSON.stringify(profile)], { type: 'application/json' }));
    if (photo) {
      const jpeg = dataUrlToBlob(photo);
      // 서버는 JPEG만 받음(조정 화면이 만든 JPEG 외의 형식은 보내지 않음)
      if (jpeg.type !== 'image/jpeg') throw new Error('JPEG 사진만 올릴 수 있습니다.');
      // 파일 이름이 있는 File로 보냄(서버가 업로드 파일로 인식)
      body.append('photo', new File([jpeg], 'profile.jpg', { type: jpeg.type }));
    }

    return await requestData(
      bffApi.post('members/me/registration', { body }),
      registrationSchema,
      'registration',
    );
  } catch (error) {
    throw normalizeError(error);
  }
};

import type { components } from '@app/api-core/generated';
import { type ApiContract, normalizeError } from '@app/api-core';
import { z } from 'zod';
import type { Gender } from '@/shared/components/profile/GenderField';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { dataUrlToBlob } from '@/shared/lib/image/dataUrl';
import { toServerGender } from '@/shared/lib/profile/gender';

/** 프로필 사진을 어떻게 할지: 그대로, 새 사진(조정을 마친 JPEG data URL), 기본 이미지로 */
export type ProfilePhotoChange =
  | { action: 'KEEP' }
  | { action: 'REPLACE'; photo: string }
  | { action: 'RESET' };

export type ProfileUpdateInput = {
  /** 앞뒤 공백을 지운 닉네임 */
  nickname: string;
  photo: ProfilePhotoChange;
  /**
   * 출생연도·성별. 추가 개인정보에 동의한 사람만 넣음(동의하지 않았으면 보내지 않음, 기능명세서 7.2.6)
   * 비운 값은 키를 빼고 보내 서버가 없음(null)으로 저장함
   */
  demographics?: { birthYear?: number | undefined; gender?: Gender | undefined } | undefined;
};

/** `PUT /api/v1/members/me/profile` 응답. 다시 받은 내 프로필로 화면을 맞추므로 값은 검증만 함 */
const updatedProfileSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
}) satisfies z.ZodType<Omit<ApiContract<components['schemas']['MemberResponse']>, 'defaultBunch'>>;

/**
 * 내 프로필 수정. multipart(`profile` JSON의 닉네임·사진 처리·출생연도와 성별 + 새 사진이면 `photo` JPEG)
 * 실패는 `ApiError`로 던짐(닉네임 중복은 가입과 같은 `USER_002`로 봄)
 */
export const updateMyProfile = async ({ nickname, photo, demographics }: ProfileUpdateInput) => {
  try {
    const profile = {
      nickname,
      imageAction: photo.action,
      ...(demographics
        ? {
            demographics: {
              ...(demographics.birthYear === undefined
                ? {}
                : { birthYear: demographics.birthYear }),
              ...(demographics.gender ? { gender: toServerGender(demographics.gender) } : {}),
            },
          }
        : {}),
    } satisfies components['schemas']['MemberProfileRequest'];
    const body = new FormData();
    body.append('profile', new Blob([JSON.stringify(profile)], { type: 'application/json' }));
    if (photo.action === 'REPLACE') {
      const jpeg = dataUrlToBlob(photo.photo);
      // 조정 화면이 만든 JPEG만 보냄(가입 사진 업로드와 같은 기준)
      if (jpeg.type !== 'image/jpeg') throw new Error('JPEG 사진만 올릴 수 있습니다.');
      body.append('photo', new File([jpeg], 'profile.jpg', { type: jpeg.type }));
    }
    return await requestData(
      bffApi.put('members/me/profile', { body }),
      updatedProfileSchema,
      'profile update',
    );
  } catch (error) {
    throw normalizeError(error);
  }
};

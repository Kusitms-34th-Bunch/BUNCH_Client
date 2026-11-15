import type { components } from '@app/api-core/generated';
import { type ApiContract, normalizeError } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { dataUrlToBlob } from '@/shared/lib/dataUrl';

/** 프로필 사진을 어떻게 할지: 그대로, 새 사진(조정을 마친 JPEG data URL), 기본 이미지로 */
export type ProfilePhotoChange =
  | { action: 'KEEP' }
  | { action: 'REPLACE'; photo: string }
  | { action: 'RESET' };

export type ProfileUpdateInput = {
  /** 앞뒤 공백을 지운 닉네임 */
  nickname: string;
  photo: ProfilePhotoChange;
};

/** `PUT /api/v1/members/me/profile` 응답. 다시 받은 내 프로필로 화면을 맞추므로 값은 검증만 함 */
const updatedProfileSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
}) satisfies z.ZodType<Omit<ApiContract<components['schemas']['MemberResponse']>, 'defaultBunch'>>;

/**
 * 내 프로필 수정. multipart(`profile` JSON의 닉네임·사진 처리 + 새 사진이면 `photo` JPEG)
 * 출생연도·성별은 계약에 없어 보내지 않음(필드가 생기면 여기와 `toMyProfile`을 고침, mock-server-status.md 확인 표, 2026-11-16 확인)
 * 실패는 `ApiError`로 던짐(닉네임 중복은 가입과 같은 `USER_002`로 봄)
 */
export const updateMyProfile = async ({ nickname, photo }: ProfileUpdateInput) => {
  try {
    const profile = {
      nickname,
      imageAction: photo.action,
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

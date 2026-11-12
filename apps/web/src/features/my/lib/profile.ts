import type { MyProfile } from './types';

type ServerProfile = { nickname: string | null; imageSrc: string | null };

/** 서버 프로필을 화면 모양으로. 닉네임이 없으면 빈 값, 사진이 없으면 화면이 기본 이미지로 대체 */
export const toMyProfile = (profile: ServerProfile): MyProfile => ({
  nickname: profile.nickname ?? '',
  imageSrc: profile.imageSrc ?? undefined,
});

/** 프로필을 아직 받지 못했을 때(불러오는 중·실패) 마이페이지가 그리는 값 */
export const EMPTY_MY_PROFILE: MyProfile = { nickname: '' };

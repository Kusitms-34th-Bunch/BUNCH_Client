import type { Gender } from '@/shared/components/profile/GenderField';

export type MyProfile = {
  nickname: string;
  /** 프로필 이미지 주소(없으면 배경색 원) */
  imageSrc?: string | undefined;
  /** 출생연도 4자리(입력하지 않았으면 없음) */
  birthYear?: number | undefined;
  gender?: Gender | undefined;
};

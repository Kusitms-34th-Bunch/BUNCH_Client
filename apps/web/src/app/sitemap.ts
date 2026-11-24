import type { MetadataRoute } from 'next';
import { LOGIN_PATH } from '@/features/auth/constants/paths';
import { SITE_ORIGIN } from '@/shared/constants/site';

// 공개 화면은 로그인 하나. 초대장은 링크마다 토큰이 달라 넣지 않음
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_ORIGIN}${LOGIN_PATH}` }];
}

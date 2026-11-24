import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/shared/constants/site';

// 수집은 열고 색인은 페이지별 noindex로 막음(막으면 noindex를 못 읽어 외부 링크가 URL만 색인될 수 있음)
// 색인 대상은 로그인뿐(sitemap), BFF 응답만 수집에서 뺌
export default function robots(): MetadataRoute.Robots {
  // 가짜 서버를 켠 UT 빌드는 전부 막음(root layout의 noindex와 같은 조건)
  if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}

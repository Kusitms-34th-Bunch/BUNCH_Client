import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';

afterEach(() => vi.unstubAllEnvs());

describe('검색 수집 설정', () => {
  it('운영 빌드는 BFF만 빼고 수집을 열어 페이지의 noindex를 읽게 하며 sitemap을 알린다', () => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', '');

    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: '/api/' },
      sitemap: 'https://app.bunch.kr/sitemap.xml',
    });
  });

  it('가짜 서버를 켠 빌드는 전부 막는다', () => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'enabled');

    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  it('sitemap에는 로그인 화면만 있다', () => {
    expect(sitemap()).toEqual([{ url: 'https://app.bunch.kr/login' }]);
  });
});

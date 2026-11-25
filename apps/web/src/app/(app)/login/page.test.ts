import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/components', () => ({
  LoginEntry: () => null,
}));

const { metadata } = await import('./page');

describe('로그인 화면 metadata', () => {
  it('색인을 막지 않고 검색·공유용 제목, 설명, canonical을 둔다', () => {
    expect(metadata.robots).toBeUndefined();
    expect(metadata.title).toEqual({ absolute: 'BUNCH - 함께한 순간이 모이는 곳' });
    expect(metadata.description).toBe('함께한 순간이 모이는 곳');
    expect(metadata.alternates?.canonical).toBe('https://app.bunch.kr/login');
    expect(metadata.openGraph).toMatchObject({
      siteName: 'BUNCH',
      url: 'https://app.bunch.kr/login',
      locale: 'ko_KR',
      description: metadata.description,
      images: [
        expect.objectContaining({ url: '/images/og/default.png', width: 1800, height: 945 }),
      ],
    });
    expect(metadata.itunes).toEqual({ appId: '6834488511' });
  });
});

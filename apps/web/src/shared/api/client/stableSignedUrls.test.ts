import { describe, expect, it } from 'vitest';
import { stableSignedUrls } from './stableSignedUrls';

const signed = (path: string, signature: string, { expires = 1800, extra = '' } = {}) =>
  `https://r2.example.com/bunch-dev/photos/${path}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20261125T140000Z&X-Amz-Expires=${expires}&X-Amz-Signature=${signature}${extra}`;
const minutes = (value: number) => value * 60 * 1000;

describe('stableSignedUrls', () => {
  it('같은 사진을 다시 받으면 유효 시간이 절반 넘게 남은 이전 주소를 그대로 쓴다(#573)', () => {
    const first = signed('a/thumbnail.jpg', 'aaa');
    expect(stableSignedUrls({ photos: [{ src: first }] }, minutes(0))).toEqual({
      photos: [{ src: first }],
    });

    const again = signed('a/thumbnail.jpg', 'bbb');
    expect(stableSignedUrls({ photos: [{ src: again }], title: '제목' }, minutes(14))).toEqual({
      photos: [{ src: first }],
      title: '제목',
    });
  });

  it('절반 넘게 지났으면 새 주소로 바꾸고, 그 뒤로는 새 주소를 기준으로 쓴다', () => {
    stableSignedUrls(signed('b/thumbnail.jpg', 'aaa'), minutes(0));
    const fresh = signed('b/thumbnail.jpg', 'ccc');
    expect(stableSignedUrls(fresh, minutes(16))).toBe(fresh);
    expect(stableSignedUrls(signed('b/thumbnail.jpg', 'ddd'), minutes(20))).toBe(fresh);
  });

  it('다른 사진·서명 밖 쿼리가 다른 주소·서명 없는 주소·비정상 유효 시간은 그대로 둔다', () => {
    stableSignedUrls(signed('c/a.jpg', 'aaa'), minutes(0));
    const other = signed('d/a.jpg', 'bbb');
    expect(stableSignedUrls(other, minutes(1))).toBe(other);
    const resized = signed('c/a.jpg', 'ccc', { extra: '&w=400' });
    expect(stableSignedUrls(resized, minutes(1))).toBe(resized);
    expect(stableSignedUrls('https://cdn.example.com/a.jpg', minutes(1))).toBe(
      'https://cdn.example.com/a.jpg',
    );

    // 유효 시간이 상한(7일)을 넘는 가짜 주소는 기억하지 않아 진짜 주소를 덮지 않음
    stableSignedUrls(signed('e/a.jpg', 'fake', { expires: 999_999_999 }), minutes(0));
    const real = signed('e/a.jpg', 'real');
    expect(stableSignedUrls(real, minutes(1))).toBe(real);
  });
});

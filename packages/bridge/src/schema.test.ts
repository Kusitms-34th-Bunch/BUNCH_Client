import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  galleryImageSchema,
  isSavableImageUrl,
  MAX_PICKED_PHOTOS,
  MAX_UPLOAD_IMAGE_DATA_URL,
  pickedPhotoIdSchema,
  pickedPhotoIdsSchema,
  pickedPhotoSchema,
  pickGalleryImageOptionsSchema,
  pickGalleryImagesOptionsSchema,
  pickPhotosResultSchema,
  saveImagesToAlbumResultSchema,
  saveImageUrlsSchema,
  setNativeTabBarParamsSchema,
  socialLoginResultSchema,
  socialProviderSchema,
  uploadImageSchema,
} from './schema.ts';

void test('소셜 서비스는 카카오·Google·Apple만 허용한다', () => {
  for (const provider of ['kakao', 'google', 'apple']) {
    assert.equal(socialProviderSchema.safeParse(provider).success, true, provider);
  }
  assert.equal(socialProviderSchema.safeParse('naver').success, false);
});

void test('소셜 로그인 성공은 ID 토큰이 필요하고 카카오·Apple은 nonce도 필요하다', () => {
  const parse = (value: unknown) => socialLoginResultSchema.safeParse(value).success;
  assert.equal(parse({ status: 'success', provider: 'google', idToken: 'token' }), true);
  assert.equal(
    parse({ status: 'success', provider: 'kakao', idToken: 'token', nonce: 'nonce' }),
    true,
  );
  assert.equal(parse({ status: 'success', provider: 'kakao', idToken: 'token' }), false);
  assert.equal(parse({ status: 'success', provider: 'apple', idToken: 'token' }), false);
  assert.equal(parse({ status: 'success', provider: 'google', idToken: '' }), false);
  assert.equal(parse({ status: 'success', provider: 'naver', idToken: 'token' }), false);
});

void test('소셜 로그인 취소는 별도 결과이며 토큰을 싣지 않는다', () => {
  assert.equal(socialLoginResultSchema.safeParse({ status: 'cancelled' }).success, true);
  assert.equal(socialLoginResultSchema.safeParse({ status: 'failed' }).success, false);
});

void test('네이티브 탭 ID는 서로 달라야 한다', () => {
  const items = [
    { id: 'home', label: '홈', path: '/home' },
    { id: 'search', label: '검색', path: '/search' },
  ];
  assert.equal(setNativeTabBarParamsSchema.safeParse({ items, selectedId: 'home' }).success, true);
  assert.equal(
    setNativeTabBarParamsSchema.safeParse({
      items: [items[0], { ...items[1], id: 'home' }],
      selectedId: 'home',
    }).success,
    false,
  );
});

void test('탭 경로는 같은 출처의 절대 경로만 허용한다', () => {
  const tab = (path: string) => ({
    items: [
      { id: 'home', label: '홈', path },
      { id: 'search', label: '검색', path: '/search' },
    ],
    selectedId: 'home',
  });
  assert.equal(setNativeTabBarParamsSchema.safeParse(tab('/feed')).success, true);
  for (const path of [
    'feed',
    '//evil.test',
    '/\\evil.test',
    'https://evil.test/feed',
    '/\t/evil.test',
    '/\n/evil.test',
  ]) {
    assert.equal(setNativeTabBarParamsSchema.safeParse(tab(path)).success, false, path);
  }
});

void test('갤러리 미리보기는 크기가 제한된 JPEG data URL만 허용한다', () => {
  assert.equal(
    galleryImageSchema.safeParse({ dataUrl: 'data:image/jpeg;base64,YWJj' }).success,
    true,
  );
  for (const dataUrl of [
    'file:///photo.jpg',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,YWJj',
    'data:image/jpeg;base64,',
    `data:image/jpeg;base64,${'A'.repeat(4 * 1024 * 1024)}`,
  ]) {
    assert.equal(galleryImageSchema.safeParse({ dataUrl }).success, false);
  }
});

void test('갤러리 선택 옵션은 edit 불리언만 허용하고 생략할 수 있다', () => {
  assert.equal(pickGalleryImageOptionsSchema.safeParse(undefined).success, true);
  assert.equal(pickGalleryImageOptionsSchema.safeParse({}).success, true);
  assert.equal(pickGalleryImageOptionsSchema.safeParse({ edit: false }).success, true);
  assert.equal(pickGalleryImageOptionsSchema.safeParse({ edit: 'no' }).success, false);
  assert.equal(pickGalleryImageOptionsSchema.safeParse({ edit: false, extra: 1 }).success, false);
});

void test('고른 사진 정보는 촬영 날짜·시각이 형식에 맞을 때만 받는다', () => {
  const parse = (value: unknown) => pickedPhotoSchema.safeParse(value).success;
  assert.equal(parse({ id: 'p1' }), true);
  assert.equal(parse({ id: 'p1', capturedDate: '2026-10-19' }), true);
  assert.equal(parse({ id: 'p1', capturedDate: '2026-10-19', capturedTime: '19:30:05' }), true);
  assert.equal(parse({ id: 'p1', capturedDate: '2026-13-01' }), false);
  assert.equal(parse({ id: 'p1', capturedDate: '2026-10-19', capturedTime: '24:00:00' }), false);
  assert.equal(parse({ id: 'p1', capturedDate: '2026-10-19', capturedTime: '19:30' }), false);
  assert.equal(parse({ id: '' }), false);
});

void test('촬영 시각은 촬영 날짜 없이 보낼 수 없다(서버 규칙)', () => {
  assert.equal(pickedPhotoSchema.safeParse({ id: 'p1', capturedTime: '19:30:05' }).success, false);
});

void test('고른 사진 정보에는 위치 같은 다른 값이 섞여 들어올 수 없다', () => {
  const parse = (value: unknown) => pickedPhotoSchema.safeParse(value).success;
  assert.equal(parse({ id: 'p1', gps: { latitude: 37.5, longitude: 127 } }), false);
  assert.equal(parse({ id: 'p1', exif: { GPSLatitude: 37.5 } }), false);
  assert.equal(parse({ id: 'p1', uri: 'file:///photo.jpg' }), false);
});

void test('선택·촬영 결과는 picked(1~50장)·canceled·denied만 허용한다', () => {
  const parse = (value: unknown) => pickPhotosResultSchema.safeParse(value).success;
  const photos = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ id: `p${index}` }));
  assert.equal(parse({ status: 'picked', photos: photos(1) }), true);
  assert.equal(parse({ status: 'picked', photos: photos(MAX_PICKED_PHOTOS) }), true);
  assert.equal(parse({ status: 'picked', photos: photos(MAX_PICKED_PHOTOS + 1) }), false);
  assert.equal(parse({ status: 'picked', photos: [] }), false);
  assert.equal(parse({ status: 'canceled' }), true);
  assert.equal(parse({ status: 'denied' }), true);
  assert.equal(parse({ status: 'failed' }), false);
});

void test('여러 장 선택 옵션의 limit은 1~50장 정수만 허용한다', () => {
  const parse = (value: unknown) => pickGalleryImagesOptionsSchema.safeParse(value).success;
  assert.equal(parse(undefined), true);
  assert.equal(parse({}), true);
  assert.equal(parse({ limit: 1 }), true);
  assert.equal(parse({ limit: 50 }), true);
  assert.equal(parse({ limit: 0 }), false);
  assert.equal(parse({ limit: 51 }), false);
  assert.equal(parse({ limit: 1.5 }), false);
  assert.equal(parse({ limit: 5, extra: true }), false);
});

void test('업로드용 사진은 상한 안의 JPEG data URL만 허용한다', () => {
  const parse = (value: unknown) => uploadImageSchema.safeParse(value).success;
  assert.equal(parse({ dataUrl: 'data:image/jpeg;base64,AAAA' }), true);
  assert.equal(parse({ dataUrl: 'data:image/png;base64,AAAA' }), false);
  assert.equal(parse({ dataUrl: 'data:image/jpeg;base64,' }), false);
  const prefix = 'data:image/jpeg;base64,';
  assert.equal(
    parse({ dataUrl: prefix + 'A'.repeat(MAX_UPLOAD_IMAGE_DATA_URL - prefix.length) }),
    true,
  );
  assert.equal(
    parse({ dataUrl: prefix + 'A'.repeat(MAX_UPLOAD_IMAGE_DATA_URL - prefix.length + 4) }),
    false,
  );
});

void test('존재하지 않는 날짜는 형식이 맞아도 거절한다', () => {
  const parse = (capturedDate: string) =>
    pickedPhotoSchema.safeParse({ id: 'p1', capturedDate }).success;
  assert.equal(parse('2026-02-31'), false);
  assert.equal(parse('2026-04-31'), false);
  assert.equal(parse('2026-02-29'), false);
  assert.equal(parse('2024-02-29'), true);
});

void test('사진 id는 비어 있거나 너무 길면 거절한다', () => {
  assert.equal(pickedPhotoIdSchema.safeParse('photo-abc123-1').success, true);
  assert.equal(pickedPhotoIdSchema.safeParse('').success, false);
  assert.equal(pickedPhotoIdSchema.safeParse('p'.repeat(65)).success, false);
  assert.equal(pickedPhotoIdSchema.safeParse(1).success, false);
});

void test('놓아 줄 사진 id 목록은 문자열 배열만 받고 500개까지 허용한다', () => {
  assert.equal(pickedPhotoIdsSchema.safeParse(['a', 'b']).success, true);
  assert.equal(pickedPhotoIdsSchema.safeParse([]).success, true);
  assert.equal(pickedPhotoIdsSchema.safeParse(['a', '']).success, false);
  assert.equal(pickedPhotoIdsSchema.safeParse('a').success, false);
  assert.equal(pickedPhotoIdsSchema.safeParse(Array(501).fill('a')).success, false);
});

void test('앨범에 저장할 주소는 https 주소 1~50개만 받는다', () => {
  assert.equal(saveImageUrlsSchema.safeParse(['https://cdn.example.com/a.jpg']).success, true);
  assert.equal(saveImageUrlsSchema.safeParse([]).success, false);
  assert.equal(saveImageUrlsSchema.safeParse(['http://cdn.example.com/a.jpg']).success, false);
  assert.equal(saveImageUrlsSchema.safeParse(['file:///private/a.jpg']).success, false);
  assert.equal(saveImageUrlsSchema.safeParse(['/relative/a.jpg']).success, false);
  assert.equal(saveImageUrlsSchema.safeParse(Array(50).fill('https://a.test/a.jpg')).success, true);
  assert.equal(
    saveImageUrlsSchema.safeParse(Array(51).fill('https://a.test/a.jpg')).success,
    false,
  );
});

void test('앨범 저장 결과는 saved(사진별 성공 여부)와 denied만 받는다', () => {
  assert.equal(
    saveImagesToAlbumResultSchema.safeParse({ status: 'saved', results: [true, false] }).success,
    true,
  );
  assert.equal(saveImagesToAlbumResultSchema.safeParse({ status: 'denied' }).success, true);
  assert.equal(saveImagesToAlbumResultSchema.safeParse({ status: 'saved' }).success, false);
  assert.equal(saveImagesToAlbumResultSchema.safeParse({ status: 'other' }).success, false);
});

void test('앨범에 저장할 주소는 IP 주소·계정 정보·내부 호스트를 거절한다', () => {
  assert.equal(isSavableImageUrl('https://cdn.example.com/a.jpg?sig=1'), true);
  assert.equal(isSavableImageUrl('https://192.168.0.1/a.jpg'), false);
  assert.equal(isSavableImageUrl('https://169.254.169.254/latest'), false);
  assert.equal(isSavableImageUrl('https://[::1]/a.jpg'), false);
  assert.equal(isSavableImageUrl('https://localhost/a.jpg'), false);
  assert.equal(isSavableImageUrl('https://intranet/a.jpg'), false);
  assert.equal(isSavableImageUrl('https://printer.local/a.jpg'), false);
  assert.equal(isSavableImageUrl('https://user:pass@cdn.example.com/a.jpg'), false);
  assert.equal(isSavableImageUrl('http://cdn.example.com/a.jpg'), false);
});

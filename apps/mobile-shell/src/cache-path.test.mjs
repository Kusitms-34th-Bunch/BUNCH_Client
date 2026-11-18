import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isInsideDirectory } from './cache-path.ts';

const cache = 'file:///data/user/0/app/cache/';

test('캐시 폴더 안의 파일은 지울 수 있다', () => {
  assert.equal(isInsideDirectory(`${cache}ImagePicker/a.jpg`, cache), true);
  assert.equal(isInsideDirectory(`${cache}a.jpg`, cache), true);
  // 폴더 uri 끝의 슬래시 유무와 관계없음
  assert.equal(isInsideDirectory(`${cache}a.jpg`, 'file:///data/user/0/app/cache'), true);
});

test('캐시 밖의 파일(사용자의 앨범 원본 등)은 지우지 않는다', () => {
  assert.equal(isInsideDirectory('file:///storage/emulated/0/DCIM/Camera/a.jpg', cache), false);
  assert.equal(isInsideDirectory('content://media/external/images/media/1', cache), false);
  assert.equal(isInsideDirectory('file:///data/user/0/app/files/a.jpg', cache), false);
});

test('이름만 비슷한 다른 폴더는 안으로 보지 않는다', () => {
  assert.equal(isInsideDirectory('file:///data/user/0/app/cache-backup/a.jpg', cache), false);
  assert.equal(isInsideDirectory('file:///data/user/0/app/cache2/a.jpg', cache), false);
});

test('폴더 자신과 상위 폴더로 벗어나는 경로는 안으로 보지 않는다', () => {
  assert.equal(isInsideDirectory(cache, cache), false);
  assert.equal(isInsideDirectory(`${cache}../files/a.jpg`, cache), false);
  assert.equal(isInsideDirectory(`${cache}ImagePicker/../../files/a.jpg`, cache), false);
  assert.equal(isInsideDirectory(`${cache}./a.jpg`, cache), false);
});

test('iOS의 /private/var 표기와 /var 표기를 같은 폴더로 본다', () => {
  const iosCache = 'file:///var/mobile/Containers/Data/Application/ID/Library/Caches/';
  assert.equal(
    isInsideDirectory(
      'file:///private/var/mobile/Containers/Data/Application/ID/Library/Caches/ImagePicker/a.jpg',
      iosCache,
    ),
    true,
  );
  assert.equal(
    isInsideDirectory(
      'file:///var/mobile/Containers/Data/Application/ID/Library/Caches/ImagePicker/a.jpg',
      'file:///private/var/mobile/Containers/Data/Application/ID/Library/Caches/',
    ),
    true,
  );
  // 다른 앱 컨테이너는 접두가 같아 보여도 안으로 보지 않음
  assert.equal(
    isInsideDirectory(
      'file:///private/var/mobile/Containers/Data/Application/OTHER/Library/Caches/a.jpg',
      iosCache,
    ),
    false,
  );
});

test('퍼센트 인코딩된 ..로 폴더를 벗어나는 경로도 걸러 낸다', () => {
  assert.equal(isInsideDirectory(`${cache}%2e%2e/files/a.jpg`, cache), false);
  assert.equal(isInsideDirectory(`${cache}ImagePicker/%2E%2E/%2E%2E/files/a.jpg`, cache), false);
  // 공백·한글처럼 인코딩된 파일명은 정상 경로로 인식
  assert.equal(isInsideDirectory(`${cache}ImagePicker/%EC%82%AC%EC%A7%84%201.jpg`, cache), true);
});

test('잘못된 퍼센트 인코딩은 안전하게 거절한다', () => {
  assert.equal(isInsideDirectory(`${cache}a%E0%A4%A.jpg`, cache), false);
});

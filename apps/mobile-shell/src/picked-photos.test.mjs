import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  getPickedPhoto,
  pickedPhotoCount,
  registerPickedPhoto,
  releasePickedPhotos,
} from './picked-photos.ts';

const source = (name) => ({ uri: `file:///${name}.jpg`, width: 4032, height: 3024 });

beforeEach(() => releasePickedPhotos());

test('보관한 사진은 돌려받은 id로 다시 찾는다', () => {
  const id = registerPickedPhoto(source('a'));
  assert.deepEqual(getPickedPhoto(id), source('a'));
});

test('같은 사진을 두 번 등록해도 id는 서로 다르다', () => {
  const first = registerPickedPhoto(source('a'));
  const second = registerPickedPhoto(source('a'));
  assert.notEqual(first, second);
  assert.equal(pickedPhotoCount(), 2);
});

test('모르는 id를 읽으려 하면 오류다', () => {
  assert.throws(() => getPickedPhoto('photo-unknown'), /찾을 수 없어요/);
});

test('놓아 준 사진은 더 읽을 수 없고 다른 사진은 남는다', () => {
  const first = registerPickedPhoto(source('a'));
  const second = registerPickedPhoto(source('b'));
  releasePickedPhotos([first]);
  assert.throws(() => getPickedPhoto(first));
  assert.deepEqual(getPickedPhoto(second), source('b'));
});

test('ids를 생략하면 모두 놓아 준다', () => {
  registerPickedPhoto(source('a'));
  registerPickedPhoto(source('b'));
  releasePickedPhotos();
  assert.equal(pickedPhotoCount(), 0);
});

test('모르는 id를 놓아 주려 해도 오류 없이 무시한다', () => {
  const id = registerPickedPhoto(source('a'));
  assert.doesNotThrow(() => releasePickedPhotos(['photo-unknown']));
  assert.deepEqual(getPickedPhoto(id), source('a'));
});

test('놓아 준 사진을 돌려줘서 임시 파일을 지우는 데 쓸 수 있다', () => {
  const first = registerPickedPhoto(source('a'));
  registerPickedPhoto(source('b'));
  assert.deepEqual(releasePickedPhotos([first]), [source('a')]);
  assert.deepEqual(releasePickedPhotos(), [source('b')]);
});

test('이미 놓아 준 사진이나 모르는 id는 돌려주지 않는다(같은 파일을 두 번 지우지 않음)', () => {
  const id = registerPickedPhoto(source('a'));
  assert.deepEqual(releasePickedPhotos([id, 'photo-unknown']), [source('a')]);
  assert.deepEqual(releasePickedPhotos([id]), []);
});

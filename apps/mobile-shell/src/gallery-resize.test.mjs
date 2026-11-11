import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  base64ByteLength,
  fitLongEdge,
  MAX_UPLOAD_EDGE,
  UPLOAD_QUALITIES,
  UPLOAD_TARGET_BYTES,
} from './gallery-resize.ts';

test('긴 변이 상한 이하이면 줄이지 않는다', () => {
  assert.equal(fitLongEdge(2048, 1536), null);
  assert.equal(fitLongEdge(800, 600), null);
});

test('업로드용 상한은 2560px이고 서버 상한(4096px) 안이다', () => {
  assert.equal(MAX_UPLOAD_EDGE, 2560);
  assert.equal(fitLongEdge(2560, 1440, MAX_UPLOAD_EDGE), null);
  assert.deepEqual(fitLongEdge(4032, 3024, MAX_UPLOAD_EDGE), { width: 2560 });
  assert.deepEqual(fitLongEdge(3024, 4032, MAX_UPLOAD_EDGE), { height: 2560 });
});

test('긴 변만 상한으로 줄인다(가로·세로)', () => {
  assert.deepEqual(fitLongEdge(4032, 3024), { width: 2048 });
  assert.deepEqual(fitLongEdge(3024, 4032), { height: 2048 });
  assert.deepEqual(fitLongEdge(3000, 3000), { width: 2048 });
});

test('base64 문자열의 바이트 수를 패딩까지 반영해 계산한다', () => {
  assert.equal(base64ByteLength(''), 0);
  assert.equal(base64ByteLength('QQ=='), 1);
  assert.equal(base64ByteLength('QUI='), 2);
  assert.equal(base64ByteLength('QUJD'), 3);
});

test('압축 품질 후보는 점점 높은 압축으로 내려가고 목표 크기는 서버 상한(6MB)보다 작다', () => {
  assert.deepEqual(
    [...UPLOAD_QUALITIES],
    [...UPLOAD_QUALITIES].sort((a, b) => b - a),
  );
  assert.ok(UPLOAD_QUALITIES.every((quality) => quality > 0 && quality <= 1));
  assert.ok(UPLOAD_TARGET_BYTES < 6 * 1024 * 1024);
});

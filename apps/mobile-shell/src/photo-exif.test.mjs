import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifySource,
  formatLocalDateTime,
  formatUtcOffset,
  parseExifDateTime,
  parseUtcOffset,
  readCapturedAt,
  readCapturedUtcOffset,
} from './photo-exif.ts';

test('EXIF 날짜·시각을 촬영 현지 날짜·시각으로 바꾼다', () => {
  assert.deepEqual(parseExifDateTime('2026:10:19 19:30:05'), {
    capturedDate: '2026-10-19',
    capturedTime: '19:30:05',
  });
  // 구분자가 다르거나 소수초·시간대가 붙어도 날짜·시각만 꺼냄
  assert.deepEqual(parseExifDateTime('2026-10-19T19:30:05.123+09:00'), {
    capturedDate: '2026-10-19',
    capturedTime: '19:30:05',
  });
  assert.deepEqual(parseExifDateTime('  2026:10:19 00:00:00  '), {
    capturedDate: '2026-10-19',
    capturedTime: '00:00:00',
  });
});

test('날짜만 있으면 시각 없이 날짜만 돌려준다', () => {
  assert.deepEqual(parseExifDateTime('2026:10:19'), { capturedDate: '2026-10-19' });
});

test('올바르지 않은 날짜는 버리고, 시각만 올바르지 않으면 날짜만 남긴다', () => {
  assert.equal(parseExifDateTime('0000:00:00 00:00:00'), null);
  assert.equal(parseExifDateTime('1899:12:31 10:00:00'), null);
  assert.equal(parseExifDateTime('2026:13:01 10:00:00'), null);
  assert.equal(parseExifDateTime('2026:02:30 10:00:00'), null);
  assert.deepEqual(parseExifDateTime('2026:10:19 24:00:00'), { capturedDate: '2026-10-19' });
  assert.deepEqual(parseExifDateTime('2026:10:19 10:60:00'), { capturedDate: '2026-10-19' });
});

test('윤년의 2월 29일만 올바른 날짜로 본다', () => {
  assert.equal(parseExifDateTime('2024:02:29 10:00:00')?.capturedDate, '2024-02-29');
  assert.equal(parseExifDateTime('2026:02:29 10:00:00'), null);
});

test('문자열이 아니거나 형식이 다르면 null이다', () => {
  for (const value of [undefined, null, 20261019, {}, '', 'yesterday', '19:30:05']) {
    assert.equal(parseExifDateTime(value), null, String(value));
  }
});

test('촬영 시각(DateTimeOriginal)을 먼저 쓰고, 없을 때만 디지털화 시각을 쓴다', () => {
  assert.deepEqual(
    readCapturedAt({
      DateTimeOriginal: '2026:10:19 19:30:05',
      DateTimeDigitized: '2026:10:20 01:00:00',
    }),
    { capturedDate: '2026-10-19', capturedTime: '19:30:05' },
  );
  assert.deepEqual(readCapturedAt({ DateTimeDigitized: '2026:10:20 01:00:00' }), {
    capturedDate: '2026-10-20',
    capturedTime: '01:00:00',
  });
  // Original이 올바르지 않으면 디지털화 시각으로 넘어감
  assert.deepEqual(
    readCapturedAt({
      DateTimeOriginal: '0000:00:00 00:00:00',
      DateTimeDigitized: '2026:10:20 01:00:00',
    }),
    { capturedDate: '2026-10-20', capturedTime: '01:00:00' },
  );
});

test('수정 시각(DateTime)은 촬영 시각이 아니라서 쓰지 않는다', () => {
  assert.deepEqual(readCapturedAt({ DateTime: '2026:10:19 19:30:05' }), {});
});

test('EXIF가 없으면 빈 객체다', () => {
  assert.deepEqual(readCapturedAt(undefined), {});
  assert.deepEqual(readCapturedAt(null), {});
  assert.deepEqual(readCapturedAt({}), {});
});

test('EXIF에 위치가 들어 있어도 결과에는 날짜·시각만 담긴다', () => {
  const result = readCapturedAt({
    DateTimeOriginal: '2026:10:19 19:30:05',
    GPSLatitude: 37.5665,
    GPSLongitude: 126.978,
    '{GPS}': { Latitude: 37.5665, Longitude: 126.978 },
    Make: 'Apple',
  });
  assert.deepEqual(Object.keys(result).sort(), ['capturedDate', 'capturedTime']);
  assert.equal(JSON.stringify(result).includes('37.5665'), false);
});

test('기기 현지 날짜·시각을 두 자리로 맞춰 돌려준다', () => {
  assert.deepEqual(formatLocalDateTime(new Date(2026, 0, 5, 3, 4, 9)), {
    capturedDate: '2026-01-05',
    capturedTime: '03:04:09',
  });
});

test('iOS처럼 촬영 시각이 {Exif} 하위 객체에 있어도 읽는다', () => {
  assert.deepEqual(readCapturedAt({ '{Exif}': { DateTimeOriginal: '2026:10:19 19:30:05' } }), {
    capturedDate: '2026-10-19',
    capturedTime: '19:30:05',
  });
  assert.deepEqual(readCapturedAt({ Exif: { DateTimeDigitized: '2026:10:20 01:00:00' } }), {
    capturedDate: '2026-10-20',
    capturedTime: '01:00:00',
  });
});

test('최상위 값이 있으면 그것을 먼저 쓰고, 다른 하위 객체는 열어 보지 않는다', () => {
  assert.deepEqual(
    readCapturedAt({
      DateTimeOriginal: '2026:10:19 19:30:05',
      '{Exif}': { DateTimeOriginal: '2026:01:01 00:00:00' },
    }),
    { capturedDate: '2026-10-19', capturedTime: '19:30:05' },
  );
  // 위치가 든 하위 객체와 수정 시각이 든 {TIFF}는 읽지 않음
  assert.deepEqual(
    readCapturedAt({
      '{GPS}': { DateStamp: '2026:10:19', TimeStamp: '10:30:05' },
      '{TIFF}': { DateTime: '2026:10:19 19:30:05' },
    }),
    {},
  );
});

test('{Exif}가 객체가 아니면 무시한다', () => {
  assert.deepEqual(readCapturedAt({ '{Exif}': 'oops', Exif: ['x'] }), {});
});

test('UTC 오프셋은 -12:00 ~ +14:00의 ±HH:mm만 받는다', () => {
  assert.equal(parseUtcOffset('+09:00'), '+09:00');
  assert.equal(parseUtcOffset(' -05:30 '), '-05:30');
  assert.equal(parseUtcOffset('-12:00'), '-12:00');
  assert.equal(parseUtcOffset('+14:00'), '+14:00');
  assert.equal(parseUtcOffset('+14:30'), undefined);
  assert.equal(parseUtcOffset('-12:30'), undefined);
  assert.equal(parseUtcOffset('+09:60'), undefined);
  assert.equal(parseUtcOffset('+9:00'), undefined);
  assert.equal(parseUtcOffset('Z'), undefined);
  assert.equal(parseUtcOffset(9), undefined);
});

test('촬영 시각의 UTC 오프셋을 읽고 없으면 없음이다', () => {
  assert.equal(readCapturedUtcOffset({ OffsetTimeOriginal: '+09:00' }), '+09:00');
  assert.equal(readCapturedUtcOffset({ OffsetTimeDigitized: '-05:00' }), '-05:00');
  assert.equal(
    readCapturedUtcOffset({ OffsetTimeOriginal: '+09:00', OffsetTimeDigitized: '-05:00' }),
    '+09:00',
  );
  assert.equal(readCapturedUtcOffset({ '{Exif}': { OffsetTimeOriginal: '+01:00' } }), '+01:00');
  assert.equal(readCapturedUtcOffset({ OffsetTimeOriginal: 'garbage' }), undefined);
  assert.equal(readCapturedUtcOffset({}), undefined);
  assert.equal(readCapturedUtcOffset(null), undefined);
});

test('오프셋을 읽어도 위치 같은 다른 값은 새지 않는다', () => {
  const result = readCapturedUtcOffset({
    OffsetTimeOriginal: '+09:00',
    GPSLatitude: 37.5665,
    '{GPS}': { Latitude: 37.5665 },
  });
  assert.equal(result, '+09:00');
});

test('기기의 UTC 오프셋을 ±HH:mm으로 돌려준다', () => {
  // Date.getTimezoneOffset은 UTC보다 동쪽이면 음수
  assert.equal(formatUtcOffset({ getTimezoneOffset: () => -540 }), '+09:00');
  assert.equal(formatUtcOffset({ getTimezoneOffset: () => 300 }), '-05:00');
  assert.equal(formatUtcOffset({ getTimezoneOffset: () => -345 }), '+05:45');
  assert.equal(formatUtcOffset({ getTimezoneOffset: () => 0 }), '+00:00');
});

test('원본 유형: 카메라 정보가 있으면 CAMERA, EXIF만 있고 카메라 정보가 없으면 SAVED_IMAGE', () => {
  assert.equal(classifySource({ Make: 'Apple', Model: 'iPhone 16' }), 'CAMERA');
  assert.equal(classifySource({ Model: 'SM-S931N' }), 'CAMERA');
  // iOS는 제조사·모델을 {TIFF}에 묶어 줌
  assert.equal(classifySource({ '{TIFF}': { Make: 'Apple' } }), 'CAMERA');
  assert.equal(classifySource({ Make: '  ' }), 'SAVED_IMAGE');
  assert.equal(classifySource({}), 'SAVED_IMAGE');
  assert.equal(classifySource({ DateTimeOriginal: '2026:10:19 19:30:05' }), 'SAVED_IMAGE');
});

test('원본 유형: EXIF를 읽지 못하면 UNKNOWN이다', () => {
  assert.equal(classifySource(undefined), 'UNKNOWN');
  assert.equal(classifySource(null), 'UNKNOWN');
});

test('원본 유형: 스크린샷 신호가 있으면 SCREENSHOT이다', () => {
  assert.equal(classifySource({ '{Exif}': { UserComment: 'Screenshot' } }), 'SCREENSHOT');
  assert.equal(classifySource({}, 'Screenshot_20261019-193005.png'), 'SCREENSHOT');
  assert.equal(classifySource({}, '스크린샷 2026-10-19.png'), 'SCREENSHOT');
  // 카메라 정보와 함께 있어도 스크린샷 신호를 먼저 본다
  assert.equal(classifySource({ Make: 'Apple', UserComment: 'Screenshot' }), 'SCREENSHOT');
  assert.equal(classifySource({}, 'IMG_1234.JPG'), 'SAVED_IMAGE');
});

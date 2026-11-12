import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatLocalDateTime, parseExifDateTime, readCapturedAt } from './photo-exif.ts';

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

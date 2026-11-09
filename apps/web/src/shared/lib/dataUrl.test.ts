import { describe, expect, it } from 'vitest';
import { dataUrlToBlob } from './dataUrl';

describe('dataUrlToBlob', () => {
  it('base64 data URL을 같은 형식·내용의 Blob으로 바꾼다', async () => {
    const blob = dataUrlToBlob('data:image/jpeg;base64,YWJj');

    expect(blob.type).toBe('image/jpeg');
    expect(await blob.text()).toBe('abc');
  });

  it.each(['', 'not a data url', 'data:image/jpeg,YWJj', 'data:image/jpeg;base64,'])(
    '형식이 맞지 않으면(%s) 던진다',
    (value) => {
      expect(() => dataUrlToBlob(value)).toThrow();
    },
  );
});

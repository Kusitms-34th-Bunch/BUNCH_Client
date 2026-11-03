import { afterEach, describe, expect, it } from 'vitest';
import { clearPhotoAddEntry, isPhotoAddEntry, markPhotoAddEntry } from './photoAddEntry';

afterEach(clearPhotoAddEntry);

describe('photoAddEntry', () => {
  it('표시하기 전에는 앱 안 진입이 아니다', () => {
    expect(isPhotoAddEntry()).toBe(false);
  });

  it('표시하면 앱 안 진입이고 지우면 아니다', () => {
    markPhotoAddEntry();
    expect(isPhotoAddEntry()).toBe(true);

    clearPhotoAddEntry();
    expect(isPhotoAddEntry()).toBe(false);
  });
});

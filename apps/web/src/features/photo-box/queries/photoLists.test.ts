import { describe, expect, it } from 'vitest';
import { datedPhotosQueryOptions, undatedPhotosQueryOptions } from './photoLists';

describe('사진 목록 query', () => {
  it('날짜 있는 사진·날짜 모르는 사진 모두 첫 쪽만 저장하는 표시를 단다(화면마다 신선 시간이 달라도 같음)', () => {
    const marked = { persist: true, persistFirstPageOnly: true };
    expect(datedPhotosQueryOptions('1').meta).toEqual(marked);
    expect(datedPhotosQueryOptions('1', { staleTime: 0 }).meta).toEqual(marked);
    expect(undatedPhotosQueryOptions('1').meta).toEqual(marked);
  });
});

import { describe, expect, it } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { pickNewerDetail, withPendingComment } from './draftMapping';

const detail = (revision: number) => ({ revision }) as BundleDetail;

describe('pickNewerDetail', () => {
  it('기준이 없거나 revision이 같거나 크면 새 상세를 고른다', () => {
    const next = detail(2);
    expect(pickNewerDetail(undefined, next)).toBe(next);
    expect(pickNewerDetail(detail(2), next)).toBe(next);
    expect(pickNewerDetail(detail(1), next)).toBe(next);
  });

  it('늦게 도착한 낡은 상세는 기준을 덮지 않는다', () => {
    const current = detail(3);
    expect(pickNewerDetail(current, detail(2))).toBe(current);
  });
});

describe('withPendingComment', () => {
  const comments = [
    { memberId: 'a', text: '하나' },
    { memberId: 'b', text: '둘' },
  ];

  it('입력이 없으면 목록을 그대로 둔다', () => {
    expect(withPendingComment(comments, 'a', undefined)).toBe(comments);
  });

  it('내 코멘트가 있으면 그 글자만 바꾼다', () => {
    expect(withPendingComment(comments, 'a', '새 글')).toEqual([
      { memberId: 'a', text: '새 글' },
      { memberId: 'b', text: '둘' },
    ]);
  });

  it('내 코멘트가 없으면 맨 뒤에 더한다', () => {
    expect(withPendingComment(comments, 'c', '셋')).toEqual([
      ...comments,
      { memberId: 'c', text: '셋' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { dateConfirmCopy, deleteConfirmCopy } from './messages';

describe('deleteConfirmCopy (명세 3.3.5)', () => {
  it('내가 올린 사진만이면 한 장과 여러 장의 제목이 다르다', () => {
    expect(deleteConfirmCopy('own', 1, 0)).toEqual({
      title: '이 사진을 삭제할까요?',
      lines: ['삭제 이후에는 복구할 수 없어요.'],
    });
    expect(deleteConfirmCopy('own', 3, 0).title).toBe('선택한 사진 3장을 삭제할까요?');
  });

  it('관리자가 다른 멤버 사진만 또는 섞어 고르면 각각의 제목이다', () => {
    expect(deleteConfirmCopy('others', 2, 0).title).toBe('다른 멤버가 업로드한 사진이에요.');
    expect(deleteConfirmCopy('others-included', 2, 0).title).toBe(
      '다른 멤버가 업로드한 사진이 포함되어 있어요.',
    );
  });

  it('함께 올린 사진을 지우면 내 이름만 사라진다고 알린다', () => {
    expect(deleteConfirmCopy('co-uploaded', 1, 1)).toEqual({
      title: '내가 올린 사진을 삭제할까요?',
      lines: ['사진은 그대로 유지되고, 업로더 목록에서 내 이름만 사라져요.'],
    });
  });

  it('혼자 올린 사진과 섞이면 사진함에 남는 장수를 두 번째 줄로 알린다', () => {
    expect(deleteConfirmCopy('mixed', 5, 2)).toEqual({
      title: '선택한 사진 5장을 삭제할까요?',
      lines: ['삭제 이후에는 복구할 수 없어요.', '다른 멤버도 올린 사진 2장은 사진함에 남아요.'],
    });
  });
});

describe('dateConfirmCopy (명세 3.4.1)', () => {
  it('다른 멤버 사진만이면 「다른 멤버가 올린 사진이에요.」', () => {
    expect(dateConfirmCopy('others')).toEqual({
      title: '다른 멤버가 올린 사진이에요.',
      description: '날짜를 변경하면 사진함에서 변경된 날짜로 보여요.',
    });
  });

  it('내 사진이 섞였거나 함께 올린 사진이 있으면 「포함되어 있어요」', () => {
    expect(dateConfirmCopy('included').title).toBe('다른 멤버가 업로드한 사진이 포함되어 있어요.');
  });
});

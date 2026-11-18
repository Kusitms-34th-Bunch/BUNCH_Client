import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ALL_MEMBERS, type PhotoBoxData } from '@/features/photo-box/lib/types';
import { SelectPhotoList } from './SelectPhotoList';

const emptyBox: PhotoBoxData = {
  bunch: { id: '1', name: '퇴근런클럽' },
  viewer: { memberId: '1', isAdmin: false },
  members: [
    { id: '1', name: '지예' },
    { id: '2', name: '경진' },
  ],
  photos: [],
};

const renderList = (memberId = ALL_MEMBERS) =>
  render(
    <SelectPhotoList
      data={emptyBox}
      selection={[]}
      selectedCounts={{}}
      memberId={memberId}
      onMemberChange={vi.fn()}
      onToggle={vi.fn()}
    />,
  );

describe('SelectPhotoList 빈 상태(기능명세서 4.1.2)', () => {
  it('사진함에 사진이 없으면 사진 고르기 문구를 보인다(올리기 버튼이 없어 사진함과 다름)', () => {
    renderList();

    expect(screen.getByText('아직 사진이 없어요.')).toBeInTheDocument();
    expect(screen.getByText('사진함에 사진을 올리면 번들을 만들 수 있어요.')).toBeInTheDocument();
    expect(screen.queryByText('첫 번째 사진을 공유해 보세요')).toBeNull();
  });

  it('고른 멤버의 사진이 없으면 사진함과 같은 문구를 보인다', () => {
    renderList('2');

    expect(screen.getByText('첫 사진을 기다리고 있어요!')).toBeInTheDocument();
    expect(screen.queryByText('아직 사진이 없어요.')).toBeNull();
  });
});

'use client';

import { useMemo } from 'react';
import type { PhotoSelection } from '@/features/photo-box/lib/selection';
import { MemberFilter } from '@/features/photo-box/components/MemberFilter';
import { PhotoBoxEmpty } from '@/features/photo-box/components/PhotoBoxEmpty';
import { PhotoSelectionProvider } from '@/features/photo-box/components/PhotoSelectionContext';
import { UndatedPhotos } from '@/features/photo-box/components/UndatedPhotos';
import { filterByMember, splitPhotos } from '@/features/photo-box/lib/photoDate';
import { ALL_MEMBERS, type PhotoBoxData } from '@/features/photo-box/lib/types';
import { SelectDateSection } from './SelectDateSection';

type SelectPhotoListProps = {
  data: PhotoBoxData;
  /** 누른 순서대로 담은 선택한 사진 id */
  selection: PhotoSelection;
  selectedCounts: Readonly<Record<string, number>>;
  memberId: string;
  onMemberChange: (_memberId: string) => void;
  onToggle: (_photoId: string) => void;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  /** 번들을 만드는 동안처럼 목록을 누를 수 없게 함 */
  inert?: boolean | undefined;
};

/**
 * 사진함 사진을 멤버 필터·날짜별 격자로 보며 순서대로 고르는 본문
 * 번들 만들기 첫 화면(`BundleSelect`)과 번들 사진 추가 화면(`DraftPhotoAdd`)이 같은 모양을 쓰도록 둠
 */
export function SelectPhotoList({
  data,
  selection,
  selectedCounts,
  memberId,
  onMemberChange,
  onToggle,
  currentYear = new Date().getFullYear(),
  inert,
}: SelectPhotoListProps) {
  const { sections, undated } = useMemo(
    () => splitPhotos(filterByMember(data.photos, memberId), currentYear),
    [data.photos, memberId, currentYear],
  );
  const isEmpty = sections.length === 0 && undated.length === 0;
  const hasPhotos = data.photos.length > 0;

  return (
    <PhotoSelectionProvider value={{ active: true, selection, onToggle }}>
      <div className="flex min-h-full flex-col" inert={inert}>
        <MemberFilter
          members={data.members}
          selectedId={memberId}
          onSelect={onMemberChange}
          selectedCounts={selectedCounts}
        />
        {undated.length > 0 ? <UndatedPhotos photos={undated} /> : null}
        {sections.map((section) => (
          <SelectDateSection key={section.dateKey} section={section} />
        ))}
        {isEmpty ? (
          <PhotoBoxEmpty reason={hasPhotos || memberId !== ALL_MEMBERS ? 'member' : 'bunch'} />
        ) : null}
      </div>
    </PhotoSelectionProvider>
  );
}

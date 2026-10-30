'use client';

import { FloatingButton } from '@app/design-system/web';
import { useMemo, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { filterByMember, splitPhotos } from '../lib/photoDate';
import { ALL_MEMBERS, type PhotoBoxState } from '../lib/types';
import { MemberFilter } from './MemberFilter';
import { NoBunch } from './NoBunch';
import { PhotoBoxEmpty } from './PhotoBoxEmpty';
import { PhotoBoxError } from './PhotoBoxError';
import { PhotoBoxHeader } from './PhotoBoxHeader';
import { PhotoBoxSkeleton } from './PhotoBoxSkeleton';
import { PhotoDateSection } from './PhotoDateSection';
import { UndatedPhotos } from './UndatedPhotos';

type PhotoBoxScreenProps = {
  state: PhotoBoxState;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onRetry?: (() => void) | undefined;
  /** 번치 이름을 눌렀을 때(전환 목록은 추후 작업) */
  onBunchClick?: (() => void) | undefined;
  /** 「선택」을 눌렀을 때(선택 모드는 별도 이슈) */
  onSelectClick?: (() => void) | undefined;
  /** 「+」를 눌렀을 때(올리기 시트는 추후 작업) */
  onUploadClick?: (() => void) | undefined;
};

/** 사진함 탭 화면. 상태(로딩·오류·번치 없음·목록)를 받아 그리고 멤버 필터만 스스로 관리 */
export function PhotoBoxScreen({
  state,
  currentYear = new Date().getFullYear(),
  onRetry,
  onBunchClick,
  onSelectClick,
  onUploadClick,
}: PhotoBoxScreenProps) {
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  const photos = state.kind === 'ready' ? state.data.photos : undefined;

  const { sections, undated } = useMemo(
    () => splitPhotos(photos ? filterByMember(photos, memberId) : [], currentYear),
    [photos, memberId, currentYear],
  );

  if (state.kind === 'loading') return <PhotoBoxSkeleton />;
  if (state.kind === 'error') return <PhotoBoxError onRetry={onRetry} />;
  if (state.kind === 'no-bunch') {
    return (
      <PageShell>
        <h1 className="sr-only">사진함</h1>
        <NoBunch />
      </PageShell>
    );
  }

  const { bunch, members } = state.data;
  const isEmpty = sections.length === 0 && undated.length === 0;

  return (
    <PageShell
      header={
        <PhotoBoxHeader bunch={bunch} onBunchClick={onBunchClick} onSelectClick={onSelectClick} />
      }
      // 「+」는 스크롤과 상관없이 고정: 본문 바로 아래의 높이 0 영역에 겹쳐 배치
      bottom={
        <div className="relative h-0">
          <FloatingButton
            icon="add"
            aria-label="사진 올리기"
            onClick={onUploadClick}
            className="right-s8 bottom-s5 absolute z-10"
          />
        </div>
      }
    >
      <h1 className="sr-only">사진함</h1>
      {/* 마지막 줄 사진이 「+」에 가리지 않도록 버튼 높이(52px)와 아래 여백(20px)만큼 하단 여백 */}
      <div className="flex min-h-full flex-col pb-18">
        <MemberFilter members={members} selectedId={memberId} onSelect={setMemberId} />
        {undated.length > 0 ? <UndatedPhotos photos={undated} /> : null}
        {sections.map((section) => (
          <PhotoDateSection key={section.dateKey} section={section} />
        ))}
        {isEmpty ? <PhotoBoxEmpty reason={memberId === ALL_MEMBERS ? 'bunch' : 'member'} /> : null}
      </div>
    </PageShell>
  );
}

'use client';

import { toast } from '@app/design-system';
import { FloatingButton } from '@app/design-system/web';
import { useMemo, useRef, useState } from 'react';
import { HideMainTabBar } from '@/shared/components/layout/HideMainTabBar';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { filterByMember, splitPhotos } from '../lib/photoDate';
import { countSelectedByMember, toggleSelection, type PhotoSelection } from '../lib/selection';
import { ALL_MEMBERS, type PhotoBoxState } from '../lib/types';
import { MemberFilter } from './MemberFilter';
import { NoBunch } from './NoBunch';
import { PhotoBoxEmpty } from './PhotoBoxEmpty';
import { PhotoBoxError } from './PhotoBoxError';
import { PhotoBoxHeader } from './PhotoBoxHeader';
import { PhotoBoxSkeleton } from './PhotoBoxSkeleton';
import { PhotoDateSection } from './PhotoDateSection';
import { PhotoSelectionProvider } from './PhotoSelectionContext';
import { PhotoSelectionMenu, type PhotoMenuAction } from './PhotoSelectionMenu';
import { UndatedPhotos } from './UndatedPhotos';

type PhotoBoxScreenProps = {
  state: PhotoBoxState;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onRetry?: (() => void) | undefined;
  /** 번치 이름을 눌렀을 때(전환 목록은 추후 작업) */
  onBunchClick?: (() => void) | undefined;
  /** 「+」를 눌렀을 때(올리기 시트는 추후 작업) */
  onUploadClick?: (() => void) | undefined;
  /** 선택 모드 「⋯」 메뉴에서 항목을 골랐을 때(고른 사진 id를 누른 순서대로 전달). 각 동작은 이어지는 흐름이 맡음 */
  onMenuAction?: ((_action: PhotoMenuAction, _selection: PhotoSelection) => void) | undefined;
};

/** 사진함 탭 화면. 상태(로딩·오류·번치 없음·목록)를 받아 그리고 멤버 필터와 선택 모드를 스스로 관리 */
export function PhotoBoxScreen({
  state,
  currentYear = new Date().getFullYear(),
  onRetry,
  onBunchClick,
  onUploadClick,
  onMenuAction,
}: PhotoBoxScreenProps) {
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<PhotoSelection>([]);
  // 메뉴는 닫히는 모션이 끝날 때까지 화면에 남기므로 열림과 마운트를 따로 둠
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const photos = state.kind === 'ready' ? state.data.photos : undefined;

  const { sections, undated } = useMemo(
    () => splitPhotos(photos ? filterByMember(photos, memberId) : [], currentYear),
    [photos, memberId, currentYear],
  );

  const selectedCounts = useMemo(
    () => (selecting && photos ? countSelectedByMember(selection, photos) : undefined),
    [selecting, selection, photos],
  );

  const handleToggle = (photoId: string) => {
    const result = toggleSelection(selection, photoId);
    if (result.rejected) {
      toast(PHOTO_BOX_MESSAGES.maxSelection);
      return;
    }
    setSelection(result.selection);
    // 고른 사진이 없어지면 「⋯」가 꺼지므로 열려 있던 메뉴도 닫음
    if (result.selection.length === 0) setMenuOpen(false);
  };

  const startSelecting = () => setSelecting(true);
  const stopSelecting = () => {
    setSelecting(false);
    setSelection([]);
    setMenuOpen(false);
    setMenuMounted(false);
  };
  const toggleMenu = () => {
    setMenuMounted(true);
    setMenuOpen((open) => !open);
  };

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
        <PhotoBoxHeader
          bunch={bunch}
          onBunchClick={onBunchClick}
          selecting={selecting}
          onSelectClick={startSelecting}
          onCancelClick={stopSelecting}
        />
      }
      // 「+」(선택 모드에서는 「⋯」)는 스크롤과 상관없이 고정: 본문 바로 아래의 높이 0 영역에 겹쳐 배치
      bottom={
        <div className="relative h-0">
          {selecting && menuMounted ? (
            // 메뉴는 「⋯」 위 10px, 오른쪽 정렬(Figma 사진함_08): 「⋯」 높이 3.25rem + 간격 0.625rem
            <div className="right-s8 absolute bottom-[calc(var(--main-tab-bar-height)+var(--main-tab-bar-float-gap)+3.875rem)] z-20">
              <PhotoSelectionMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                onExited={() => setMenuMounted(false)}
                onSelect={(action) => onMenuAction?.(action, selection)}
                triggerRef={menuTriggerRef}
              />
            </div>
          ) : null}
          <FloatingButton
            ref={menuTriggerRef}
            icon={selecting ? 'more' : 'add'}
            aria-label={selecting ? '메뉴 열기' : '사진 올리기'}
            aria-haspopup={selecting ? 'menu' : undefined}
            aria-expanded={selecting ? menuOpen : undefined}
            disabled={selecting && selection.length === 0}
            onClick={selecting ? toggleMenu : onUploadClick}
            className="right-s8 absolute bottom-[calc(var(--main-tab-bar-height)+var(--main-tab-bar-float-gap))] z-10"
          />
        </div>
      }
    >
      <h1 className="sr-only">사진함</h1>
      {selecting ? <HideMainTabBar /> : null}
      <PhotoSelectionProvider value={{ active: selecting, selection, onToggle: handleToggle }}>
        <div className="flex min-h-full flex-col">
          <MemberFilter
            members={members}
            selectedId={memberId}
            onSelect={setMemberId}
            selectedCounts={selectedCounts}
          />
          {undated.length > 0 ? <UndatedPhotos photos={undated} /> : null}
          {sections.map((section) => (
            <PhotoDateSection key={section.dateKey} section={section} />
          ))}
          {isEmpty ? (
            <PhotoBoxEmpty reason={memberId === ALL_MEMBERS ? 'bunch' : 'member'} />
          ) : null}
        </div>
      </PhotoSelectionProvider>
    </PageShell>
  );
}

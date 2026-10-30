'use client';

import { FloatingButton } from '@app/design-system/web';
import { useMemo, useRef, useState } from 'react';
import { HideMainTabBar } from '@/shared/components/layout/HideMainTabBar';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { usePhotoSelectionFlow } from '../hooks/usePhotoSelectionFlow';
import { filterByMember, splitPhotos } from '../lib/photoDate';
import { countSelectedByMember, type PhotoSelection } from '../lib/selection';
import { ALL_MEMBERS, type PhotoBoxActions, type PhotoBoxState } from '../lib/types';
import { MemberFilter } from './MemberFilter';
import { NoBunch } from './NoBunch';
import { PhotoBoxEmpty } from './PhotoBoxEmpty';
import { PhotoBoxError } from './PhotoBoxError';
import { PhotoBoxHeader } from './PhotoBoxHeader';
import { PhotoBoxSkeleton } from './PhotoBoxSkeleton';
import { PhotoDateSection } from './PhotoDateSection';
import { PhotoSelectionProvider } from './PhotoSelectionContext';
import { BundleConfirmDialog, DeleteConfirmDialog } from './PhotoSelectionDialogs';
import { PhotoSelectionMenu } from './PhotoSelectionMenu';
import { UndatedPhotos } from './UndatedPhotos';

// API 연결 전 기본 동작: 모두 성공하고 아무것도 사라지지 않음
const noopActions: PhotoBoxActions = {
  savePhotos: (ids) => Promise.resolve({ savedIds: ids, failedIds: [] }),
  deletePhotos: () => Promise.resolve({ removedCount: 0 }),
};

type PhotoBoxScreenProps = {
  state: PhotoBoxState;
  /** 저장·삭제 같은 서버·기기 동작 */
  actions?: PhotoBoxActions | undefined;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onRetry?: (() => void) | undefined;
  /** 번치 이름을 눌렀을 때(전환 목록은 추후 작업) */
  onBunchClick?: (() => void) | undefined;
  /** 「+」를 눌렀을 때(올리기 시트는 추후 작업) */
  onUploadClick?: (() => void) | undefined;
  /** 「번들 만들기」 확인 창에서 「예」를 눌렀을 때(고른 사진 id를 누른 순서대로 전달, 초안 생성·이동은 번들 작성 이슈) */
  onCreateBundle?: ((_selection: PhotoSelection) => void) | undefined;
  /** 「날짜 바꾸기」를 골랐을 때(시트는 추후 작업) */
  onChangeDate?: ((_selection: PhotoSelection) => void) | undefined;
};

/** 사진함 탭 화면. 상태(로딩·오류·번치 없음·목록)를 받아 그리고 멤버 필터와 선택 모드(메뉴·저장·번들·삭제)를 관리 */
export function PhotoBoxScreen({
  state,
  actions = noopActions,
  currentYear = new Date().getFullYear(),
  onRetry,
  onBunchClick,
  onUploadClick,
  onCreateBundle,
  onChangeDate,
}: PhotoBoxScreenProps) {
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  // 메뉴는 닫히는 모션이 끝날 때까지 화면에 남기므로 열림과 마운트를 따로 둠
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const data = state.kind === 'ready' ? state.data : undefined;
  const photos = data?.photos;

  const flow = usePhotoSelectionFlow({ data, actions, onCreateBundle, onChangeDate });
  const { selecting, selection } = flow;

  const { sections, undated } = useMemo(
    () => splitPhotos(photos ? filterByMember(photos, memberId) : [], currentYear),
    [photos, memberId, currentYear],
  );

  const selectedCounts = useMemo(
    () => (selecting && photos ? countSelectedByMember(selection, photos) : undefined),
    [selecting, selection, photos],
  );

  const handleToggle = (photoId: string) => {
    flow.toggle(photoId);
    // 고른 사진이 없어지면 「⋯」가 꺼지므로 열려 있던 메뉴도 닫음
    if (selection.length === 1 && selection[0] === photoId) setMenuOpen(false);
  };
  const handleCancel = () => {
    flow.stop();
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
          onSelectClick={flow.start}
          onCancelClick={handleCancel}
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
                onSelect={flow.handleMenuAction}
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
            // 저장·삭제 중에는 포커스를 잃지 않도록 disabled 대신 aria-disabled를 쓰고 누름만 무시
            aria-disabled={selecting && flow.busy ? true : undefined}
            onClick={selecting ? (flow.busy ? undefined : toggleMenu) : onUploadClick}
            className="right-s8 absolute bottom-[calc(var(--main-tab-bar-height)+var(--main-tab-bar-float-gap))] z-10"
          />
        </div>
      }
    >
      <h1 className="sr-only">사진함</h1>
      {selecting ? <HideMainTabBar /> : null}
      {/* 선택 모드 진입·선택 개수·저장 중 상태를 알리는 live region(항상 마운트해 문구만 바꿈) */}
      <p role="status" className="sr-only">
        {flow.saving
          ? PHOTO_BOX_MESSAGES.saving
          : selecting
            ? PHOTO_BOX_MESSAGES.selectionStatus(selection.length)
            : ''}
      </p>
      <PhotoSelectionProvider
        value={{
          active: selecting,
          selection,
          savingIds: flow.savingIds,
          onToggle: handleToggle,
        }}
      >
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
      <BundleConfirmDialog
        open={flow.dialog === 'bundle'}
        onClose={flow.closeDialog}
        onConfirm={flow.confirmBundle}
      />
      <DeleteConfirmDialog
        open={flow.dialog === 'delete'}
        count={selection.length}
        description={PHOTO_BOX_MESSAGES.deleteConfirmDescription(flow.deleteKind ?? 'own')}
        onClose={flow.closeDialog}
        onConfirm={() => void flow.confirmDelete()}
      />
    </PageShell>
  );
}

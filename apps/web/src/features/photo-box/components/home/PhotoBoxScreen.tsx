'use client';

import { toast } from '@app/design-system';
import { FloatingButton, PhotoUploadSheet } from '@app/design-system/web';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HideMainTabBar } from '@/shared/components/layout/HideMainTabBar';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PhotoSelectionProvider } from '../../contexts/PhotoSelectionContext';
import { usePhotoSelectionFlow } from '../../hooks/usePhotoSelectionFlow';
import { LONG_PRESS_MS } from '../../lib/dragSelect';
import { MAX_PHOTOS_IN_BOX } from '../../lib/photoActions';
import { filterByMember, splitPhotos } from '../../lib/photoDate';
import { countSelectedByMember, type PhotoSelection } from '../../lib/selection';
import { ALL_MEMBERS, type PhotoBoxActions, type PhotoBoxState } from '../../lib/types';
import { MemberFilter } from '../MemberFilter';
import { NoBunch } from '../NoBunch';
import { PhotoBoxEmpty } from '../PhotoBoxEmpty';
import { PhotoBoxError } from '../PhotoBoxError';
import { PhotoBoxMore } from '../PhotoBoxMore';
import { PhotoDragSelect } from '../PhotoDragSelect';
import { UndatedPhotos } from '../UndatedPhotos';
import { PhotoBoxHeader } from './PhotoBoxHeader';
import { PhotoBoxSkeleton } from './PhotoBoxSkeleton';
import { PhotoDragArea } from './PhotoDragArea';
import { PhotoSelectionMenu } from './PhotoSelectionMenu';

// API 연결 전 기본 동작: 모두 성공하고 아무것도 사라지지 않음
const noopActions: PhotoBoxActions = {
  savePhotos: (ids) => Promise.resolve({ savedIds: ids, failedIds: [] }),
  deletePhotos: () => Promise.resolve({ removedCount: 0 }),
  changePhotoDates: () => Promise.resolve(),
};

const noop = () => {};

// 확인 창 닫힘 전환(100ms)이 끝난 뒤에 초점을 옮기려는 지연
const DIALOG_CLOSE_MS = 150;

type PhotoBoxScreenProps = {
  state: PhotoBoxState;
  /** 저장·삭제 같은 서버·기기 동작 */
  actions?: PhotoBoxActions | undefined;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onRetry?: (() => void) | undefined;
  /** 첫 쪽 뒤의 쪽을 받다 실패했을 때 아래로 다시 스크롤하면 부름 */
  onLoadMore?: (() => void) | undefined;
  /** 번치 이름을 눌렀을 때(전환 목록은 추후 작업) */
  onBunchClick?: (() => void) | undefined;
  /** 올리기 시트에서 방식을 골랐을 때(앨범·카메라 연동은 사진 올리기 이슈, 시트는 닫고 호출) */
  onUpload?: ((_source: 'album' | 'camera') => void) | undefined;
  /** 「번들 만들기」 확인 창에서 「예」를 눌렀을 때(고른 사진 id를 누른 순서대로 전달, 초안 생성·이동은 번들 작성 이슈) */
  onCreateBundle?: ((_selection: PhotoSelection) => void) | undefined;
};

/** 사진함 탭 화면. 상태(로딩·오류·번치 없음·목록)를 받아 그리고 멤버 필터와 선택 모드(메뉴·저장·번들·삭제)를 관리 */
export function PhotoBoxScreen({
  state,
  actions = noopActions,
  currentYear = new Date().getFullYear(),
  onRetry,
  onLoadMore,
  onBunchClick,
  onUpload,
  onCreateBundle,
}: PhotoBoxScreenProps) {
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  // 메뉴는 닫히는 모션이 끝날 때까지 화면에 남기므로 열림과 마운트를 따로 둠
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const openOverlay = useScreenOverlay();
  // 끌어서 날짜를 옮기는 요청이 도는 중(저장·삭제 요청과 같이 다른 동작을 막음)
  const [dragMoving, setDragMoving] = useState(false);
  const data = state.kind === 'ready' ? state.data : undefined;
  const ready = data !== undefined;
  // 화면 상태가 바뀌어(로딩·오류·번치 없음) 창이 의미를 잃으면 모두 닫음
  useEffect(() => {
    if (!ready) openOverlay.closeAll();
  }, [ready, openOverlay]);
  const photos = data?.photos;

  // 사진을 지우면 눌렀던 메뉴·선택 칸이 사라지므로 화면 제목으로 초점을 옮김(web-interface-guidelines 「같은 화면에서 항목이 사라지면」, 확인 창이 닫힌 뒤)
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(focusTimer.current), []);
  const focusHeading = () => {
    clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(
      () => headingRef.current?.focus({ preventScroll: true }),
      DIALOG_CLOSE_MS,
    );
  };

  const flow = usePhotoSelectionFlow({ data, actions, onCreateBundle, onDeleted: focusHeading });
  const { selecting, selection } = flow;
  const busy = flow.busy || dragMoving;

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
  // 사진함이 가득 차면 시트를 열지 않고 토스트로만 알림(명세 3.2.1)
  const openUpload = () => {
    if ((photos?.length ?? 0) >= MAX_PHOTOS_IN_BOX) {
      toast(PHOTO_BOX_MESSAGES.photoBoxFull);
      return;
    }
    openOverlay((rootProps, close) => {
      const select = (source: 'album' | 'camera') => {
        close();
        onUpload?.(source);
      };
      return (
        <PhotoUploadSheet
          {...rootProps}
          title={PHOTO_BOX_MESSAGES.uploadSheetTitle(data?.bunch.name ?? '')}
          onSelectAlbum={() => select('album')}
          onTakePhoto={() => select('camera')}
        />
      );
    });
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
  // 남은 사진을 받는 중이거나 받다 실패했으면 아직 없다고 말할 수 없음(선택한 멤버의 사진이 받지 못한 쪽에 있을 수 있음)
  const isEmpty = sections.length === 0 && undated.length === 0 && state.data.more === undefined;

  let statusMessage = '';
  if (flow.saving) statusMessage = PHOTO_BOX_MESSAGES.saving;
  else if (flow.deleting) statusMessage = PHOTO_BOX_MESSAGES.deleting;
  else if (selecting) statusMessage = PHOTO_BOX_MESSAGES.selectionStatus(selection.length);
  // 선택 모드면 메뉴(저장·삭제 중에는 무시), 아니면 사진 올리기
  let floatingAction: (() => void) | undefined = openUpload;
  if (selecting) floatingAction = busy ? undefined : toggleMenu;

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
            aria-disabled={selecting && busy ? true : undefined}
            onClick={floatingAction}
            // 선택 모드에서 탭 바가 숨으면 탭 바 숨김과 비슷하게 200ms ease-out으로 내려감(아이콘은 FloatingButton이 크로스페이드)
            className="right-s8 absolute bottom-[calc(var(--main-tab-bar-height)+var(--main-tab-bar-float-gap))] z-10 motion-safe:transition-[bottom] motion-safe:duration-200 motion-safe:ease-out"
          />
        </div>
      }
    >
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        사진함
      </h1>
      {selecting ? <HideMainTabBar /> : null}
      {/* 선택 모드 진입·선택 개수·저장 중 상태를 알리는 live region(항상 마운트해 문구만 바꿈) */}
      <p role="status" className="sr-only">
        {statusMessage}
      </p>
      {/* 저장·삭제하는 동안은 화면 전체를 dim으로 덮고 가운데에 로딩(Figma 사진함_12, 삭제는 저장과 같은 표시) */}
      {flow.saving || flow.deleting ? <PageLoading /> : null}
      <PhotoSelectionProvider value={{ active: selecting, selection, onToggle: handleToggle }}>
        {/* 저장·삭제 요청이 도는 동안은 필터·사진을 inert로 막아 키보드·스크린 리더도 건드리지 못하게 함(전체 로딩이 덮는 동안은 헤더 「취소」도 눌리지 않음, 요청은 취소할 수 없어 로딩이 끝나길 기다림) */}
        <PhotoDragSelect
          className="flex min-h-full flex-col"
          inert={busy}
          yieldToLongPressMs={LONG_PRESS_MS}
        >
          <MemberFilter
            members={members}
            selectedId={memberId}
            onSelect={setMemberId}
            selectedCounts={selectedCounts}
          />
          {undated.length > 0 ? <UndatedPhotos photos={undated} /> : null}
          <PhotoDragArea
            sections={sections}
            viewer={state.data.viewer}
            actions={actions}
            enabled={selecting && !flow.busy}
            onMovingChange={setDragMoving}
          />
          {isEmpty ? (
            <PhotoBoxEmpty reason={memberId === ALL_MEMBERS ? 'bunch' : 'member'} />
          ) : null}
          <PhotoBoxMore state={state.data.more} onRetry={onLoadMore ?? noop} />
        </PhotoDragSelect>
      </PhotoSelectionProvider>
    </PageShell>
  );
}
